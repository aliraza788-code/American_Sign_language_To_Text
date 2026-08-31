"""
models/model_loader.py
=======================
Ye file 3 cheezein LOAD karti hai jab server start hota hai (SIRF EK
DAFA, baar-baar nahi -- kyunke model load karna slow hota hai):

  1) Trained Keras model (hath ki images se letter predict karne wali)
  2) class_names.json (0,1,2... numbers ko A,B,C... letters mein badalne
     ke liye)
  3) MediaPipe Hand-Landmarker (ye batata hai "kya image mein hath hai")

Baaki files (jaise prediction_service.py) yahan se in teeno cheezon ko
import karke istemal karenge -- unhe khud dobara load nahi karna padega.
"""

import json
import os
import urllib.request

import tensorflow as tf
import mediapipe as mp
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision as mp_vision

from config import settings
from models.custom_layers import RandomColorJitter, RandomCutout


def load_model():
    """Trained .keras model ko load karta hai. Custom layers
    (RandomColorJitter, RandomCutout) ka reference dena zaroori hai,
    warna 'Could not locate class' error aata hai."""
    print("Model load ho raha hai...")
    model = tf.keras.models.load_model(
        settings.MODEL_PATH,
        custom_objects={
            "RandomColorJitter": RandomColorJitter,
            "RandomCutout": RandomCutout,
        },
    )
    print("Model load ho gaya.")
    return model


def load_class_names():
    """['A', 'B', 'C', ...] jaisi list load karta hai -- model ke output
    index (0, 1, 2...) ko asal letters mein badalne ke liye zaroori hai."""
    with open(settings.CLASS_NAMES_PATH, "r") as f:
        class_names = json.load(f)
    print(f"Classes load hui: {class_names}")
    return class_names


def load_hand_detector():
    """MediaPipe ka Hand-Landmarker load karta hai -- ye batata hai
    'kya frame mein hath hai', model se bilkul ALAG cheez hai (model
    sirf 'kaunsa letter hai' batata hai, ye 'hath hai bhi ya nahi'
    batata hai)."""
    if not os.path.exists(settings.HAND_MODEL_PATH):
        print("Hand-detection model download ho raha hai (ek dafa hi hoga)...")
        urllib.request.urlretrieve(settings.HAND_MODEL_URL, settings.HAND_MODEL_PATH)
        print("Download complete.")

    hand_base_options = mp_python.BaseOptions(model_asset_path=settings.HAND_MODEL_PATH)
    hand_options = mp_vision.HandLandmarkerOptions(
        base_options=hand_base_options,
        num_hands=1,
        min_hand_detection_confidence=settings.HAND_DETECTION_CONFIDENCE,
        min_hand_presence_confidence=settings.HAND_DETECTION_CONFIDENCE,
        min_tracking_confidence=settings.HAND_DETECTION_CONFIDENCE,
        running_mode=mp_vision.RunningMode.IMAGE,
    )
    detector = mp_vision.HandLandmarker.create_from_options(hand_options)
    print("Hand-detector taiyar hai.")
    return detector


# ---------------------------------------------------------------------
# Server start hote hi, ye teeno EK DAFA load ho jate hain (is file ke
# import hote hi chalte hain). prediction_service.py inhe yahan se
# import karke use karega -- baar baar load nahi karna padega.
# ---------------------------------------------------------------------
model = load_model()
class_names = load_class_names()
hands_detector = load_hand_detector()