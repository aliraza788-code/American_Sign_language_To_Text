"""
services/prediction_service.py
================================
Ye file '/predict' endpoint ka ASAL logic hai. main.py sirf isay CALL
karta hai -- saara kaam (image decode, hand-detect, crop, classify)
yahan hota hai.

Ye bilkul wahi logic hai jo purani working main.py mein tha -- sirf
alag file mein rakha hai, kuch change nahi kiya.
"""

import base64
import logging

import cv2
import numpy as np

from config import settings
from schemas import PredictionResponse
from models.model_loader import model, class_names, hands_detector

import mediapipe as mp

# TEMPORARY DEBUG LOGGING -- Render ke "Logs" tab mein ye messages
# dikhenge, taake hum dekh sakein "kya image sahi decode ho rahi hai"
# aur "MediaPipe ko hath kyun nahi mil raha". Jab masla solve ho jaye,
# hum ye lines hata denge.
logger = logging.getLogger("uvicorn.error")


def crop_hand_region(frame_rgb, hand_landmarks, margin=None):
    """
    MediaPipe landmarks se hath ka tight bounding box nikaal kar, margin
    de kar, aur SQUARE bana kar crop return karta hai.

    Ye isliye zaroori hai kyunke dataset ki images 'sirf hath, close-up,
    kam background' style ki hain -- is function ke baghair model ko har
    dafa alag zoom/position wali image milti thi jo training se match
    nahi karti thi (isi wajah se live accuracy training accuracy se bohat
    kam thi, chahe validation 100% ho).

    Return: cropped_image (numpy array) ya None agar crop invalid ho.
    """
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
    logger.info(f"[DEBUG] Received base64 string, length={len(image_base64)}")

    img_bytes = base64.b64decode(image_base64)
    logger.info(f"[DEBUG] Decoded bytes, length={len(img_bytes)}")

    np_arr = np.frombuffer(img_bytes, np.uint8)
    frame_bgr = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

    if frame_bgr is None:
        logger.info("[DEBUG] cv2.imdecode FAILED -- frame_bgr is None. Image data corrupt/invalid.")
        return PredictionResponse(hand_present=False)

    logger.info(f"[DEBUG] Decoded image shape: {frame_bgr.shape}")

    frame_rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)

    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=frame_rgb)
    hand_result = hands_detector.detect(mp_image)
    hand_present = len(hand_result.hand_landmarks) > 0

    logger.info(f"[DEBUG] MediaPipe hand_present={hand_present}, num_hands_found={len(hand_result.hand_landmarks)}")

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