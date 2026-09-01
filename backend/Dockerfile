FROM python:3.11-slim

# MediaPipe (aur OpenCV) ko chalane ke liye zaroori system-level
# libraries -- Render ka plain Python environment inhe nahi deta,
# is liye Docker use kar ke khud install karte hain.
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    libgles2 \
    libegl1 \
    libsm6 \
    libxext6 \
    libxrender1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Render khud "$PORT" environment-variable set karta hai -- humein
# usi port par sunna hoga
CMD uvicorn main:app --host 0.0.0.0 --port $PORT