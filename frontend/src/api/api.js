/**
 * api.js
 * ======
 * Backend se baat karne ka SIRF EK raasta -- poori app mein kahin bhi
 * seedha "fetch(...)" nahi likhते, hamesha isi file ke functions
 * (predictFrame) ko call karte hain.
 *
 * Fayda: agar kal backend ka URL badal jaye, ya request ka format
 * badalna ho, sirf YE ek file update karni hai -- baaki poori app
 * (components, hooks) ko chhedna nahi padega.
 */

// .env file se backend ka address leta hai (Vite mein saari env-variables
// "VITE_" se shuru honi zaroori hain, warna browser tak nahi pahunchtin)
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

/**
 * Ek cropped hand-image (base64 string) backend ko bhejta hai,
 * prediction wapas leta hai: { hand_present, letter, confidence }
 */
export async function predictFrame(base64Image) {
  const response = await fetch(`${API_BASE_URL}/predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image: base64Image }),
  });

  if (!response.ok) {
    throw new Error(`Predict request fail hui: ${response.status}`);
  }

  return response.json();
}