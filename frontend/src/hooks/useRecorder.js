/**
 * useRecorder.js
 * ==============
 * Camera ki LIVE-DISPLAY (guide-box, overlays samet) ko record karta
 * hai, taake baad mein dekh/download kar sakein. Ye bilkul wahi logic
 * hai jo purani working app mein tha (WebM format -- browsers isay
 * achi tarah support karte hain, dono web-page pe play karne aur
 * download karne ke liye).
 *
 * ZAROORI: Hum "canvas.captureStream()" use karte hain (raw camera ki
 * stream nahi) -- taake jo bhi overlays canvas pe draw ho rahe hain
 * (guide-box, sentence-bar, confidence-log), wo bhi recording mein
 * shamil hon.
 *
 * NOTE: Is file mein koi setState "useEffect" ke andar seedha nahi
 * likhi -- saari setState calls event-based callbacks (jaise
 * "recorder.onstop") ke andar hain, is liye "set-state-in-effect"
 * rule yahan trigger hi nahi hoti.
 */

import { useRef, useState, useCallback } from "react";

export function useRecorder(canvasRef) {
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);

  const [isRecording, setIsRecording] = useState(false);
  // Jab recording complete hoti hai, ye { url, filename } object ban
  // jata hai -- RecordingPlayback.jsx isay use kar ke video dikhayega
  // aur download-button banayega.
  const [recordedVideo, setRecordedVideo] = useState(null);

  const startRecording = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    recordedChunksRef.current = [];

    // Canvas ki live-stream nikalte hain (30 frames-per-second)
    const stream = canvas.captureStream(30);

    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
      ? "video/webm;codecs=vp9"
      : "video/webm";

    const recorder = new MediaRecorder(stream, { mimeType });

    // Har chunk (recording ka tukda) milte hi save karte jate hain
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunksRef.current.push(event.data);
      }
    };

    // Recording rukte hi, saare chunks jod kar ek downloadable file banate hain
    recorder.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      setRecordedVideo({
        url,
        filename: `sign_recording_${Date.now()}.webm`,
      });
    };

    recorder.start();
    mediaRecorderRef.current = recorder;
    setIsRecording(true);
  }, [canvasRef]);

  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
    setIsRecording(false);
  }, []);

  return {
    isRecording,
    recordedVideo, // null jab tak koi recording complete na ho
    startRecording,
    stopRecording,
  };
}