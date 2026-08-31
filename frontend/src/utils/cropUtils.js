/**
 * cropUtils.js
 * ============
 * Canvas se hath ka "guide box" wala hissa CROP karne ke helper-functions.
 * Ye bilkul WAHI logic hai jo purani working index.html mein tha -- sirf
 * yahan alag file mein rakha hai taake hooks/components chhote rahein.
 *
 * (Note: backend apni taraf se bhi MediaPipe se ek dafa aur tight-crop
 * karta hai -- ye do-tarfa cropping hai, jaisa purane working version
 * mein tha, isay badla nahi gaya.)
 */

// Guide-box canvas ke kitne % hissa cover karega (center mein, square)
export const GUIDE_BOX_RATIO = 0.62;

// Backend ko bhejne wali cropped image ka size (pixels mein, square)
export const CROP_OUTPUT_SIZE = 300;

/**
 * Canvas ke bilkul center mein ek SQUARE guide-box ki position/size
 * calculate karta hai.
 */
export function getGuideBoxRect(canvasWidth, canvasHeight, ratio = GUIDE_BOX_RATIO) {
  const size = canvasWidth * ratio;
  return {
    x: (canvasWidth - size) / 2,
    y: (canvasHeight - size) / 2,
    w: size,
    h: size,
  };
}

/**
 * Video ke current frame ko canvas pe MIRRORED (natural, selfie-jaisa)
 * tarike se draw karta hai. YE SIRF USER KO DIKHANE (display) KE LIYE
 * HAI -- backend ko bhejne wali image ke liye NAHI (neeche
 * drawRawFrame dekhein).
 */
export function drawMirroredFrame(ctx, video, width, height) {
  ctx.save();
  ctx.translate(width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, 0, 0, width, height);
  ctx.restore();
}

/**
 * Video ke current frame ko RAW/UN-MIRRORED tarike se draw karta hai --
 * bilkul jaisa camera asal mein dekh raha hai.
 *
 * ZAROORI: Training dataset ki images RAW camera-frames se li gayi
 * thi (mirror kiye bina). Agar hum MIRRORED image model ko bhejein,
 * to asymmetric letters (jaise M, N, L -- jinme thumb ki left/right
 * position matter karti hai) training-data se "ulta" pattern dikhte
 * hain, jisse model confuse hota hai (live testing mein observe kiya
 * gaya). Is liye:
 *   - DISPLAY (jo user dekhta hai) = MIRRORED (drawMirroredFrame)
 *   - BACKEND ko jo bheja jata hai = RAW/UN-MIRRORED (ye function)
 */
export function drawRawFrame(ctx, video, width, height) {
  ctx.drawImage(video, 0, 0, width, height);
}

/**
 * Bade canvas se guide-box wala hissa nikaal kar, ek chote
 * (CROP_OUTPUT_SIZE x CROP_OUTPUT_SIZE) canvas pe daal deta hai, aur
 * uski base64-JPEG string wapas karta hai -- yehi backend ko bheji
 * jati hai.
 *
 * ZAROORI: "sourceCanvas" hamesha RAW/UN-MIRRORED frame wala canvas
 * hona chahiye (drawRawFrame se banaya hua), MIRRORED display-canvas
 * NAHI -- warna model ko galat-orientation wali image milegi.
 * Guide-box hamesha center mein symmetric hai, is liye box ka
 * rectangle dono (mirrored display aur raw capture) canvases pe
 * SAME rehta hai -- sirf ANDAR ka content alag hota hai.
 */
export function cropGuideBoxToBase64(sourceCanvas, cropCanvas, box, outputSize = CROP_OUTPUT_SIZE) {
  cropCanvas.width = outputSize;
  cropCanvas.height = outputSize;

  const cropCtx = cropCanvas.getContext("2d");
  cropCtx.clearRect(0, 0, outputSize, outputSize);
  cropCtx.drawImage(
    sourceCanvas,
    box.x, box.y, box.w, box.h,
    0, 0, outputSize, outputSize
  );

  const dataUrl = cropCanvas.toDataURL("image/jpeg", 0.85);
  return dataUrl.split(",")[1]; // sirf base64 hissa, "data:image/..." prefix hata kar
}