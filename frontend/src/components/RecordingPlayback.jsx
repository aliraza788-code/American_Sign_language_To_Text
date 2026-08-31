/**
 * RecordingPlayback.jsx
 * ======================
 * Jab recording complete ho jati hai, ye component dikhta hai --
 * ek <video> player (dobara dekhne ke liye) aur ek download-button.
 *
 * Ye component sirf "recordedVideo" naam ka ek prop leta hai, jisme
 * { url, filename } hota hai (useRecorder.js hook se aaya hua).
 */

export default function RecordingPlayback({ recordedVideo }) {
  const { url, filename } = recordedVideo;

  return (
    <div className="recording-section">
      <div className="label">Recorded Video:</div>
      <video src={url} controls className="recorded-video" />
      <a href={url} download={filename}>
        <button type="button">Download Video</button>
      </a>
    </div>
  );
}