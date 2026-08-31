"""
main.py
=======
Ye file SIRF HTTP routes/endpoints define karti hai. Asal logic (prediction
kaise hoti hai, waghera) yahan bilkul NAHI hai -- wo services/ folder ki
files mein hai. Ye "thin controller" pattern hai.

Frontend ab ALAG React app hai (frontend/ folder, apne dev-server pe chalta
hai) -- is liye ye file HTML serve NAHI karti, sirf JSON API deti hai.
Isi wajah se CORS middleware zaroori hai (taake React, jo alag port pe hai,
is backend ko call kar sake).
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from schemas import FrameRequest, PredictionResponse
from services import prediction_service


app = FastAPI(title="Sign Language to Text API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check():
    """Server aur model theek se chal rahe hain, ye check karne ke liye."""
    return {"status": "ok"}


@app.post("/predict", response_model=PredictionResponse)
def predict(request: FrameRequest):
    """Ek cropped hand-image (base64) leta hai, prediction wapas deta hai."""
    return prediction_service.predict_frame(request.image)