/**
 * CameraFeed.jsx
 * ==============
 * Ye component teeno hooks (useCamera, usePredictionLoop, useRecorder)
 * ko JODTA hai, aur asal <video>/<canvas> HTML render karta hai.
 *
 * Isay "container/orchestrator" component keh sakte hain -- khud koi
 * bhi complex logic nahi likhta, sirf hooks ko call karke unki values
 * ko screen par dikhata hai.
 */

import { useCamera } from "../hooks/useCamera";
import { usePredictionLoop } from "../hooks/usePredictionLoop";
import { useRecorder } from "../hooks/useRecorder";
import ControlsBar from "./ControlsBar";
import TextOutput from "./TextOutput";
import RecordingPlayback from "./RecordingPlayback";

export default function CameraFeed() {
  const { videoRef, isCameraOn, cameraError, startCamera, stopCamera } = useCamera();

  const {
    displayCanvasRef,
    rawCanvasRef,
    cropCanvasRef,
    sentence,
    boxState,
    statusText,
    confidenceText,
    addSpace,
    backspace,
    clearSentence,
  } = usePredictionLoop(videoRef, isCameraOn);

  const { isRecording, recordedVideo, startRecording, stopRecording } =
    useRecorder(displayCanvasRef);

  return (
    <div className="app">
      <h1>Sign Language (ASL) to Text</h1>

      <div className={`camera-box box-state-${boxState}`}>
        {/* Asal camera-feed -- CHHUPA hua hai, sirf video-source ke
            tor pe use hota hai. User ko display-canvas dikhta hai. */}
        <video ref={videoRef} autoPlay playsInline muted style={{ display: "none" }} />

        {/* User ko YE dikhta hai (mirrored frame + guide-box +
            overlays -- sab kuch usePredictionLoop draw karta hai) */}
        <canvas ref={displayCanvasRef} className="display-canvas" />

        {/* Hidden canvases -- sirf internal processing ke liye, kabhi
            screen par nahi dikhte */}
        <canvas ref={rawCanvasRef} style={{ display: "none" }} />
        <canvas ref={cropCanvasRef} style={{ display: "none" }} />
      </div>

      {cameraError && <p className="error-text">Camera error: {cameraError}</p>}

      <p className="confidence-text">{confidenceText}</p>
      <p className="status-text">{statusText}</p>

      <ControlsBar
        isCameraOn={isCameraOn}
        isRecording={isRecording}
        onStartCamera={startCamera}
        onStopCamera={stopCamera}
        onStartRecording={startRecording}
        onStopRecording={stopRecording}
        onSpace={addSpace}
        onBackspace={backspace}
        onClear={clearSentence}
      />

      <TextOutput sentence={sentence} />

      {recordedVideo && <RecordingPlayback recordedVideo={recordedVideo} />}
    </div>
  );
}