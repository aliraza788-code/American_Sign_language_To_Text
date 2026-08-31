"""
schemas.py
==========
Ye file batati hai ke API ko kya DATA milega, aur API kya DATA WAPAS
degi -- inhe "shapes" ya "contracts" kehte hain.

FastAPI in shapes ko khud-ba-khud CHECK karta hai: agar frontend se
koi galat/adhoora data aaye (jaise "image" field hi na ho), to FastAPI
turant ek clear error de deta hai -- backend code tak pahunchne se
pehle hi. Isse bohat saari galtiyan automatically pakdi jati hain.
"""

from typing import Optional
from pydantic import BaseModel


class FrameRequest(BaseModel):
    """
    Jab frontend '/predict' ko call karta hai, usay YE shape follow
    karna hoga: ek "image" naam ka field, jisme base64-encoded picture
    (text ke tor pe) honi chahiye.
    """
    image: str


class PredictionResponse(BaseModel):
    """
    '/predict' endpoint isi shape mein jawab wapas deta hai:
      - hand_present: kya box mein hath mila (True/False)
      - letter: kaunsa letter predict hua (agar hath na mila to khali/None)
      - confidence: kitne % confident hai model (0 se 100 ke beech)
    """
    hand_present: bool
    letter: Optional[str] = None
    confidence: float = 0.0