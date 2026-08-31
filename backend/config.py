"""
config.py
=========
Poori app ki saari SETTINGS ek hi jagah. Ye ".env" file ko padh kar
values leta hai. Agar kisi ko koi setting (jaise model-path ya
confidence-threshold) change karni ho, sirf ".env" file kholni hai --
kisi Python file ko chhedna nahi padta.
"""

import os
from dotenv import load_dotenv

# .env file dhoond kar uski values ko environment mein load karta hai
load_dotenv()


class Settings:
    # ---- Model se related paths ----
    MODEL_PATH = os.getenv("MODEL_PATH", "ml_assets/final_model.keras")
    CLASS_NAMES_PATH = os.getenv("CLASS_NAMES_PATH", "ml_assets/class_names.json")
    HAND_MODEL_PATH = os.getenv("HAND_MODEL_PATH", "ml_assets/hand_landmarker.task")
    HAND_MODEL_URL = os.getenv(
        "HAND_MODEL_URL",
        "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
    )

    # ---- Prediction tuning ----
    IMG_SIZE = int(os.getenv("IMG_SIZE", 224))
    HAND_DETECTION_CONFIDENCE = float(os.getenv("HAND_DETECTION_CONFIDENCE", 0.5))
    HAND_CROP_MARGIN = float(os.getenv("HAND_CROP_MARGIN", 0.35))

    # ---- Frontend ko allow karne ke liye (CORS) ----
    # .env mein comma se alag URLs likh sakte hain (agar zarurat ho)
    CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")


# Poori app mein isi ek "settings" object ko import karke use karte hain
settings = Settings()