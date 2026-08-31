import base64
import cv2
import numpy as np

from config import settings
from schemas import PredictionResponse
from models.model_loader import model, class_names, hands_detector

import mediapipe as mp


def crop_hand_region(frame_rgb, hand_landmarks, margin=None):
    if margin is None:
        margin = settings.HAND_CROP_MARGIN

    h, w, _ = frame_rgb.shape

    xs = [lm.x for lm in hand_landmarks]
    ys = [lm.y for lm in hand_landmarks]

    x_min, x_max = min(xs), max(xs)
    y_min, y_max = min(ys), max(ys)

    # normalized [0,1] coordinates -> pixel coordinates
    x_min_px, x_max_px = x_min * w, x_max * w
    y_min_px, y_max_px = y_min * h, y_max * h

    box_w = x_max_px - x_min_px
    box_h = y_max_px - y_min_px

    # margin add karo taake pura hath (finger-tips samet) frame mein aaye
    pad_w = box_w * margin
    pad_h = box_h * margin

    x_min_px -= pad_w
    x_max_px += pad_w
    y_min_px -= pad_h
    y_max_px += pad_h

    # SQUARE banao (chota side ko barhao) taake resize se shape distort
    # na ho -- training images bhi taqreeban square/consistent-aspect
    # thi is liye ye zaroori hai
    box_w = x_max_px - x_min_px
    box_h = y_max_px - y_min_px
    side = max(box_w, box_h)

    cx = (x_min_px + x_max_px) / 2
    cy = (y_min_px + y_max_px) / 2

    x_min_px = cx - side / 2
    x_max_px = cx + side / 2
    y_min_px = cy - side / 2
    y_max_px = cy + side / 2

    # frame ki boundary ke andar clamp karo
    x_min_px = max(0, x_min_px)
    y_min_px = max(0, y_min_px)
    x_max_px = min(w, x_max_px)
    y_max_px = min(h, y_max_px)

    x_min_i, y_min_i = int(x_min_px), int(y_min_px)
    x_max_i, y_max_i = int(x_max_px), int(y_max_px)

    if x_max_i - x_min_i < 10 or y_max_i - y_min_i < 10:
        # crop bohat chota / degenerate hai -- kaam ka nahi
        return None

    return frame_rgb[y_min_i:y_max_i, x_min_i:x_max_i]


def predict_frame(image_base64: str) -> PredictionResponse:
    """
    Base64 image leta hai, poora pipeline chalata hai:
    decode -> hand-detect -> crop -> classify -> response banao.
    """
    img_bytes = base64.b64decode(image_base64)
    np_arr = np.frombuffer(img_bytes, np.uint8)
    frame_bgr = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

    if frame_bgr is None:
        return PredictionResponse(hand_present=False)

    frame_rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)

    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=frame_rgb)
    hand_result = hands_detector.detect(mp_image)
    hand_present = len(hand_result.hand_landmarks) > 0

    if not hand_present:
        return PredictionResponse(hand_present=False)

    # ---- Poore frame ki bajaye sirf hath ka tight crop lo ----
    cropped = crop_hand_region(frame_rgb, hand_result.hand_landmarks[0])
    if cropped is None:
        return PredictionResponse(hand_present=False)

    img = cv2.resize(cropped, (settings.IMG_SIZE, settings.IMG_SIZE))
    img_array = np.expand_dims(img.astype("float32"), axis=0)

    predictions = model.predict(img_array, verbose=0)
    probabilities = predictions[0]
    idx = np.argmax(probabilities)
    predicted_class = class_names[idx]
    confidence = float(probabilities[idx] * 100)

    # NOT_SIGN ka matlab hai model ko yakeen hai ke ye koi valid ASL sign
    # nahi hai (chahe MediaPipe ne hath detect kar liya ho). Isay bhi
    # "kuch confidently detect nahi hua" jaisa treat karte hain, taake
    # frontend koi letter add na kare.
    if predicted_class == "NOT_SIGN":
        return PredictionResponse(hand_present=False)

    return PredictionResponse(
        hand_present=True,
        letter=predicted_class,
        confidence=confidence,
    )