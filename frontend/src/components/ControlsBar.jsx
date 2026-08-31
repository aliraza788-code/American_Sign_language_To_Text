/**
 * ControlsBar.jsx
 * ===============
 * Saare buttons (Start/Stop Camera, Record/Stop Recording, Space,
 * Backspace, Clear) ek jagah. Ye component khud koi logic nahi
 * rakhta -- sirf "props" (upar se milne wale functions/values) ko
 * buttons se jod deta hai. Asal kaam CameraFeed.jsx se aane wale
 * functions karte hain.
 */

export default function ControlsBar({
  isCameraOn,
  isRecording,
  onStartCamera,
  onStopCamera,
  onStartRecording,
  onStopRecording,
  onSpace,
  onBackspace,
  onClear,
}) {
  return (
    <>
      <div className="controls">
        <button onClick={onStartCamera} disabled={isCameraOn} className={isCameraOn ? "active" : ""}>
          Start Camera
        </button>
        <button
          onClick={onStopCamera}
          disabled={!isCameraOn}
          className={`stop-btn ${!isCameraOn ? "active" : ""}`}
        >
          Stop Camera
        </button>
        <button onClick={onStartRecording} disabled={!isCameraOn || isRecording}>
          Record
        </button>
        <button onClick={onStopRecording} disabled={!isRecording}>
          Stop Recording
        </button>
      </div>

      <div className="controls">
        <button onClick={onSpace}>Space</button>
        <button onClick={onBackspace}>Backspace</button>
        <button onClick={onClear}>Clear</button>
      </div>
    </>
  );
}