/**
 * useCamera.js
 * ============
 * Ek "custom hook" -- React mein isay bolte hain jab hum apna khud ka,
 * reusable "logic-piece" banate hain (jaise ek chota function jo state
 * aur refs use karta hai). Iska kaam SIRF camera start/stop karna hai.
 *
 * Ye CameraFeed.jsx component ke andar use hoga, jaise:
 *   const { videoRef, isCameraOn, startCamera, stopCamera } = useCamera();
 */

import { useRef, useState, useCallback } from "react";

export function useCamera() {
  // ---- REFS -- cheezein "yaad" rakhte hain, lekin badalne par screen
  // dobara render NAHI hota (kyunki video-element aur stream-object
  // UI mein directly nahi dikhte, sirf internally use hote hain) ----
  const videoRef = useRef(null);   // <video> HTML-element ka reference
  const streamRef = useRef(null);  // camera ki MediaStream (jab active ho)

  // ---- STATE -- ye badalne par React screen ko DOBARA RENDER karta
  // hai, taake UI (jaise button ka color, error-message) update ho ----
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState(null);

  /**
   * Camera start karta hai. "async" isliye hai kyunki browser se
   * camera-permission maangna time leta hai -- "await" us wait ko
   * handle karta hai.
   */
  const startCamera = useCallback(async () => {
    if (streamRef.current) return; // already chal rahi hai to dobara mat karo

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 480, height: 360 },
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraError(null);
      setIsCameraOn(true);
    } catch (err) {
      // Agar user ne permission deny ki, ya camera na mila
      setCameraError(err.message);
      setIsCameraOn(false);
    }
  }, []);

  /**
   * Camera band karta hai -- saari tracks (video-feed) stop karta hai
   * taake camera ki light bhi bujh jaye (privacy ke liye zaroori).
   */
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraOn(false);
  }, []);

  // Ye hook jo bhi component use karega, usay ye sab wapas milega
  return {
    videoRef,
    streamRef,
    isCameraOn,
    cameraError,
    startCamera,
    stopCamera,
  };
}