/**
 * TextOutput.jsx
 * ==============
 * Neeche wala "Text:" box jisme banaya hua sentence dikhta hai. Ye
 * bhi ek "dumb" component hai -- sirf "sentence" naam ka ek prop
 * leta hai, aur usay screen par dikha deta hai.
 */

export default function TextOutput({ sentence }) {
  return (
    <>
      <div className="label">Text:</div>
      <div className="text-output">{sentence || "(Empty)"}</div>
    </>
  );
}