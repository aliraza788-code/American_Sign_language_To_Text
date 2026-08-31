# Sign Language to Text

A web app that detects American Sign Language (A-Z) from a live camera
feed and converts it into text. Built with React (frontend), FastAPI
(backend), and a trained EfficientNetV2B0 model.

## Features

- Live webcam-based hand-sign detection
- Confidence-based letter locking (prevents flickering misreads)
- Sentence building (Space / Backspace / Clear)
- Recording + download (includes guide-box and overlays)

## Tech Stack

- **Frontend:** React + Vite
- **Backend:** FastAPI (Python)
- **Model:** TensorFlow/Keras (EfficientNetV2B0), MediaPipe (hand detection)

## Setup

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
cp .env.example .env         # then fill in your values in .env
uvicorn main:app --reload --port 8000
```

Place your model files (`best_model.keras`/`final_model.keras`,
`class_names.json`, `hand_landmarker.task`) inside `backend/ml_assets/`
(these are not included in the repo due to file size).

### Frontend

```bash
cd frontend
npm install
cp .env.example .env         # then set the backend URL in .env
npm run dev
```

Then open `http://localhost:5173` in your browser.

## Project Structure

```
backend/
├── main.py              # FastAPI endpoints
├── config.py             # settings (loaded from .env)
├── schemas.py             # request/response shapes
├── models/                # model loading + custom layers
└── services/               # prediction logic

frontend/
└── src/
    ├── components/         # UI pieces
    ├── hooks/               # camera, prediction-loop, recording logic
    ├── api/                  # backend communication
    └── utils/                 # helper functions
```