/**
 * usePredictionLoop.js
 * =====================
 * Ye sabse "important" hook hai -- yahan LOCK + CHALLENGER wala poora
 * logic hai jo decide karta hai "kab letter sentence mein add karna
 * hai". Ye bilkul WAHI logic hai jo purani working app mein tha,
 * SIRF React ke tareeqe se likha gaya hai -- koi core-logic change
 * nahi hui.
 *
 * ---------------------------------------------------------------
 * LOCK + CHALLENGER MECHANISM (jaisa aapne bataya):
 * ---------------------------------------------------------------
 *  1) Jab koi letter confidently dikhta hai aur koi lock nahi hai,
 *     TURANT us par lock ho jata hai (speed ke liye).
 *  2) Jab tak koi NAYA gesture box mein na aaye, LOCK NAHI TOOTA --
 *     chahe hath thoda bhi hile-dule (chhota flicker ignore hota hai).
 *  3) Lock sirf 2 tarikon se badalta/tootā hai:
 *       a) NAYA letter LAGATAAR CHALLENGER_FRAMES_NEEDED baar dikhe
 *          (genuine gesture-change, hath box mein hi rehte hue)
 *       b) Hath GENUINELY box se bahar chala jaye (MediaPipe khud
 *          "hath nahi hai" bole, lagataar NO_HAND_RESET_FRAMES baar)
 *  4) REPEAT letter (jaise "LL"): hath ko box se bahar-andar
 *     (blink) karna hoga -- isse "lastAddedLetter" reset hota hai,
 *     taake wahi letter dobara add ho sake.
 */

import { useRef, useState, useEffect, useCallback } from "react";
import { predictFrame } from "../api/api";
import {
  getGuideBoxRect,
  drawMirroredFrame,
  drawRawFrame,
  cropGuideBoxToBase64,
} from "../utils/cropUtils";

// ---- TUNING SETTINGS (bilkul wahi values jo purani app mein thi) ----
const CONFIDENCE_THRESHOLD = 65;      // isse neeche confidence "unsure" mani jati hai
const CAPTURE_INTERVAL_MS = 150;      // har kitni der mein ek frame backend ko bhejna hai
const NO_HAND_RESET_FRAMES = 4;       // itne LAGATAAR "hath nahi hai" frames = genuine hand-removal
const CHALLENGER_FRAMES_NEEDED = 2;   // naye letter ko itni baar LAGATAAR dikhna hai tab lock badlega
const HISTORY_MAX = 20;               // confidence-log panel mein kitne recent letters dikhane hain

export function usePredictionLoop(videoRef, isCameraOn) {
  // ---- Canvases (refs -- inhe re-render trigger nahi karna) ----
  const displayCanvasRef = useRef(null); // ye USER ko dikhta hai (mirrored)
  const rawCanvasRef = useRef(null);     // hidden -- RAW/un-mirrored frame (backend ke liye)
  const cropCanvasRef = useRef(null);    // hidden -- chota cropped frame (backend ko jo bhejte hain)

  // ---- Lock-mechanism internal state -- REFS hain kyunki ye har
  // 150ms badalte hain, in par UI turant depend nahi karta ----
  const lockedLetterRef = useRef(null);
  const challengerLetterRef = useRef(null);
  const challengerCountRef = useRef(0);
  const noHandStreakRef = useRef(0);
  const lastAddedLetterRef = useRef(null);

  const captureTimerRef = useRef(null);
  const drawLoopIdRef = useRef(null);

  // "drawFrame" apne andar khud ko recursively call karta hai (agla
  // animation-frame maangne ke liye). Seedha khud ko reference karne
  // se ESLint "accessed before declared" warning deta hai -- is liye
  // hum ek REF ke through call karte hain, jo hamesha "latest"
  // drawFrame ko point karta hai.
  const drawFrameRef = useRef(null);

  // ---- UI-facing STATE -- ye badalne par screen update hoti hai.
  // Teeno (box-color, status-message, confidence-text) ko EK object
  // mein rakha hai, taake inhe EK SATH update karte waqt sirf EK
  // setState-call ho (teen alag calls se bachne ke liye -- React
  // multiple setState-calls ko "avoid karo agar effect ke andar ho"
  // suggest karta hai). ----
  const [display, setDisplay] = useState({
    boxState: "neutral",           // "neutral" | "confident" | "unsure"
    statusText: "Camera band hai",
    confidenceText: "Confidence: --",
  });

  const [sentence, setSentence] = useState("");
  const [letterHistory, setLetterHistory] = useState([]); // [{letter, confidence}]

  /**
   * Ek naya letter LOCK ke through CONFIRM hone par sentence mein add
   * karta hai.
   */
  const addLetterToSentence = useCallback((letter, confidence) => {
    setSentence((prev) => prev + letter);
    lastAddedLetterRef.current = letter;
    setDisplay((prev) => ({ ...prev, statusText: `'${letter}' ADD ho gaya!` }));
    setLetterHistory((prev) => {
      const updated = [...prev, { letter, confidence }];
      return updated.length > HISTORY_MAX ? updated.slice(1) : updated;
    });
  }, []);

  /**
   * Backend se aaye result ko process karta hai -- LOCK + CHALLENGER
   * ka poora faisla yahan hota hai. Ye bilkul wahi 3-state logic hai
   * jo purani app mein tha.
   */
  const handleResult = useCallback((data) => {
    // ---- STATE 1: hath bilkul NAHI hai (MediaPipe confirm karta hai) ----
    if (!data.hand_present) {
      noHandStreakRef.current += 1;
      if (noHandStreakRef.current >= NO_HAND_RESET_FRAMES) {
        // Genuine hand-removal -- lock RELEASE hota hai, aur "pichla
        // add-kiya-letter" bhi bhool jate hain (taake REPEAT letter
        // ho sake, jaise "LL")
        lockedLetterRef.current = null;
        challengerLetterRef.current = null;
        challengerCountRef.current = 0;
        lastAddedLetterRef.current = null;
      }
      setDisplay({
        boxState: "neutral",
        statusText: "Camera chal raha hai — hath box ke andar rakhein",
        confidenceText: "Confidence: --",
      });
      return;
    }

    // Hath maujood hai -- "hand nikal gaya" wala counter reset
    noHandStreakRef.current = 0;

    const { letter, confidence } = data;
    const confidenceText = `Confidence: ${confidence.toFixed(0)}%  (${letter})`;

    // ---- STATE 2: hath hai, LEKIN is frame ki confidence kam hai ----
    // Lock ko BILKUL TOUCH NAHI karte -- sirf is frame ko ignore karte
    // hain (halka blur/motion se ho sakta hai, hath nikalna NAHI hai)
    if (confidence < CONFIDENCE_THRESHOLD) {
      setDisplay({
        boxState: "unsure",
        statusText: lockedLetterRef.current
          ? `'${lockedLetterRef.current}' locked (sign thodi unclear hai)`
          : "Sign clear nahi hai",
        confidenceText,
      });
      return;
    }

    // ---- STATE 3: hath hai AUR confidence achi hai -- normal lock logic ----
    if (lockedLetterRef.current === null) {
      // Koi lock nahi hai -- turant is letter par lock karo (speed)
      lockedLetterRef.current = letter;
      challengerLetterRef.current = null;
      challengerCountRef.current = 0;
    } else if (letter === lockedLetterRef.current) {
      // Lock wahi confirm ho raha hai -- koi challenger nahi
      challengerLetterRef.current = null;
      challengerCountRef.current = 0;
    } else {
      // Ye ek "challenger" hai -- naya letter, lekin abhi confirm nahi
      if (letter === challengerLetterRef.current) {
        challengerCountRef.current += 1;
      } else {
        challengerLetterRef.current = letter;
        challengerCountRef.current = 1;
      }
      if (challengerCountRef.current >= CHALLENGER_FRAMES_NEEDED) {
        // Genuine gesture-change confirm ho gaya -- lock badal do
        lockedLetterRef.current = challengerLetterRef.current;
        challengerLetterRef.current = null;
        challengerCountRef.current = 0;
      }
    }

    const locked = lockedLetterRef.current;
    const statusText = challengerLetterRef.current
      ? `'${locked}' locked -- '${challengerLetterRef.current}' challenge kar raha hai (${challengerCountRef.current}/${CHALLENGER_FRAMES_NEEDED})`
      : `'${locked}' locked`;

    setDisplay({ boxState: "confident", statusText, confidenceText });

    // ---- LETTER ADD KARO -- sirf agar lock, pichle add-kiye-gaye
    // letter se ALAG hai (repeat ke liye hath box se bahar le jaana
    // zaroori hai, upar wale STATE 1 mein handle hota hai) ----
    if (locked && locked !== lastAddedLetterRef.current) {
      addLetterToSentence(locked, confidence);
    }
  }, [addLetterToSentence]);

  /**
   * Har CAPTURE_INTERVAL_MS mein ek dafa chalta hai: RAW frame se
   * guide-box crop karta hai, backend ko bhejta hai, result handle
   * karta hai.
   */
  const captureAndPredict = useCallback(async () => {
    const video = videoRef.current;
    const rawCanvas = rawCanvasRef.current;
    const cropCanvas = cropCanvasRef.current;
    if (!video || !video.videoWidth || !rawCanvas || !cropCanvas) return;

    const w = rawCanvas.width;
    const h = rawCanvas.height;
    const box = getGuideBoxRect(w, h);
    const base64Image = cropGuideBoxToBase64(rawCanvas, cropCanvas, box);

    try {
      const data = await predictFrame(base64Image);
      handleResult(data);
    } catch (err) {
      console.error("Prediction request fail hui:", err);
      setDisplay((prev) => ({ ...prev, statusText: "Server se connect nahi ho pa raha" }));
    }
  }, [videoRef, handleResult]);

  /**
   * Har animation-frame chalta hai: DISPLAY canvas pe mirrored frame +
   * guide-box + SENTENCE-overlay + confidence-log panel draw karta hai
   * (ye sab RECORDING mein bhi save hote hain, kyunki recording isi
   * canvas ki stream leti hai). RAW canvas pe un-mirrored frame draw
   * karta hai (backend ko bhejne wali cropping isi se hoti hai, usme
   * koi overlay nahi hota).
   *
   * NOTE: Agle frame ke liye khud ko "drawFrame" naam se seedha call
   * NAHI karte (ESLint isay pasand nahi karta) -- iski jagah
   * "drawFrameRef.current" ke through call karte hain.
   */
  const drawFrame = useCallback(() => {
    const video = videoRef.current;
    const displayCanvas = displayCanvasRef.current;
    const rawCanvas = rawCanvasRef.current;

    if (video && video.videoWidth && displayCanvas && rawCanvas) {
      const w = displayCanvas.width;
      const h = displayCanvas.height;

      const displayCtx = displayCanvas.getContext("2d");
      drawMirroredFrame(displayCtx, video, w, h);

      // ---- Guide-box (jaha hath rakhna hai) ----
      const box = getGuideBoxRect(w, h);
      let boxColor = "rgba(255,255,255,0.35)";
      if (display.boxState === "confident") boxColor = "#3ddc84";
      else if (display.boxState === "unsure") boxColor = "#ef4a4a";

      displayCtx.strokeStyle = boxColor;
      displayCtx.lineWidth = Math.max(2, w * 0.006);
      if (display.boxState === "neutral") displayCtx.setLineDash([8, 6]);
      else displayCtx.setLineDash([]);
      displayCtx.strokeRect(box.x, box.y, box.w, box.h);
      displayCtx.setLineDash([]);

      // ---- SENTENCE overlay (top bar) ----
      const barHeight = h * 0.11;
      displayCtx.fillStyle = "rgba(0,0,0,0.55)";
      displayCtx.fillRect(0, 0, w, barHeight);
      displayCtx.font = `bold ${Math.round(barHeight * 0.42)}px -apple-system, sans-serif`;
      displayCtx.fillStyle = "#3ddc84";
      displayCtx.textAlign = "left";
      displayCtx.fillText("SENTENCE: " + (sentence || ".........."), w * 0.03, barHeight * 0.65);

      // ---- Confidence-Log panel (top-right corner) ----
      if (letterHistory.length > 0) {
        const panelW = w * 0.3;
        const rowH = h * 0.045;
        const panelX = w - panelW - w * 0.02;
        const panelY = barHeight + h * 0.02;
        const panelH = rowH * letterHistory.length + h * 0.03;

        displayCtx.fillStyle = "rgba(0,0,0,0.55)";
        displayCtx.fillRect(panelX, panelY, panelW, panelH);

        displayCtx.font = `bold ${Math.round(rowH * 0.55)}px -apple-system, sans-serif`;
        displayCtx.fillStyle = "#f2f3f8";
        displayCtx.fillText("Confidence Log", panelX + 8, panelY + rowH * 0.6);

        displayCtx.font = `${Math.round(rowH * 0.5)}px -apple-system, sans-serif`;
        letterHistory.forEach((item, i) => {
          const rowY = panelY + rowH * (i + 1) + rowH * 0.4;
          displayCtx.fillStyle = "#8b91a8";
          displayCtx.fillText(item.letter + ":", panelX + 8, rowY);
          displayCtx.fillStyle = "#3ddc84";
          displayCtx.fillText(item.confidence.toFixed(0) + "%", panelX + panelW * 0.4, rowY);
        });
      }

      const rawCtx = rawCanvas.getContext("2d");
      drawRawFrame(rawCtx, video, w, h);
    }

    drawLoopIdRef.current = requestAnimationFrame(() => drawFrameRef.current());
  }, [videoRef, display.boxState, sentence, letterHistory]);

  // Har render ke baad, ref ko "latest" drawFrame se update karte hain
  useEffect(() => {
    drawFrameRef.current = drawFrame;
  }, [drawFrame]);

  /**
   * Camera ON/OFF hone par prediction-loop aur draw-loop ko
   * start/stop karta hai.
   */
  useEffect(() => {
    if (!isCameraOn) {
      if (captureTimerRef.current) clearInterval(captureTimerRef.current);
      if (drawLoopIdRef.current) cancelAnimationFrame(drawLoopIdRef.current);
      captureTimerRef.current = null;
      drawLoopIdRef.current = null;

      // Sab kuch reset -- taake agli dafa camera ON ho to fresh shuru ho
      lockedLetterRef.current = null;
      challengerLetterRef.current = null;
      challengerCountRef.current = 0;
      noHandStreakRef.current = 0;
      lastAddedLetterRef.current = null;

      return undefined;
    }

    // Camera ON hui -- video ki actual resolution se canvases set karo
    const video = videoRef.current;
    const setupCanvasSize = () => {
      const w = video.videoWidth || 480;
      const h = video.videoHeight || 360;
      if (displayCanvasRef.current) {
        displayCanvasRef.current.width = w;
        displayCanvasRef.current.height = h;
      }
      if (rawCanvasRef.current) {
        rawCanvasRef.current.width = w;
        rawCanvasRef.current.height = h;
      }
    };

    if (video) {
      if (video.videoWidth) setupCanvasSize();
      else video.addEventListener("loadedmetadata", setupCanvasSize, { once: true });
    }

    drawFrame();
    captureTimerRef.current = setInterval(captureAndPredict, CAPTURE_INTERVAL_MS);

    return () => {
      if (captureTimerRef.current) clearInterval(captureTimerRef.current);
      if (drawLoopIdRef.current) cancelAnimationFrame(drawLoopIdRef.current);
    };
  }, [isCameraOn, videoRef, drawFrame, captureAndPredict]);

  // ---- Text-controls (Space / Backspace / Clear) ----
  const addSpace = useCallback(() => {
    setSentence((prev) => prev + " ");
    lastAddedLetterRef.current = null;
  }, []);

  const backspace = useCallback(() => {
    setSentence((prev) => {
      if (prev.length === 0) return prev;
      const removedChar = prev[prev.length - 1];
      if (removedChar !== " ") {
        setLetterHistory((history) => history.slice(0, -1));
      }
      return prev.slice(0, -1);
    });
    lastAddedLetterRef.current = null;
  }, []);

  const clearSentence = useCallback(() => {
    setSentence("");
    setLetterHistory([]);
    lastAddedLetterRef.current = null;
  }, []);

  // Camera band hone par hamesha "band hai" wali values dikhani hain --
  // ye SEEDHA isCameraOn se nikal (derive) rahe hain, koi effect/setState
  // ki zarurat nahi. Camera ON hone par "display" state (jo sirf
  // handleResult ke async callback se update hoti hai) use hoti hai.
  const effectiveBoxState = isCameraOn ? display.boxState : "neutral";
  const effectiveStatusText = isCameraOn ? display.statusText : "Camera band hai";
  const effectiveConfidenceText = isCameraOn ? display.confidenceText : "Confidence: --";

  return {
    displayCanvasRef,
    rawCanvasRef,
    cropCanvasRef,
    sentence,
    letterHistory,
    boxState: effectiveBoxState,
    statusText: effectiveStatusText,
    confidenceText: effectiveConfidenceText,
    addSpace,
    backspace,
    clearSentence,
  };
}