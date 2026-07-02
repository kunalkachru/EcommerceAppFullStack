const sharp = require("sharp");

async function validateQueryImage(buffer) {
  const meta = await sharp(buffer).metadata();
  if (!meta.width || !meta.height || meta.width < 80 || meta.height < 80) {
    return {
      ok: false,
      code: "too_small",
      message: "Photo is too small. Move closer or use a higher resolution image.",
    };
  }

  const gray = await sharp(buffer)
    .greyscale()
    .resize(200, 200, { fit: "inside" })
    .raw()
    .toBuffer();

  let sum = 0;
  let sumSq = 0;
  for (let i = 0; i < gray.length; i += 1) {
    sum += gray[i];
    sumSq += gray[i] * gray[i];
  }
  const mean = sum / gray.length;
  const variance = sumSq / gray.length - mean * mean;

  if (variance < 35) {
    return {
      ok: false,
      code: "too_blurry",
      message: "Photo looks blurry. Hold steady, improve lighting, and try again.",
    };
  }

  return { ok: true, sharpness: Math.round(variance) };
}

function isRecoverableImageQualityError(code) {
  return code === "too_blurry" || code === "too_small";
}

module.exports = {
  validateQueryImage,
  isRecoverableImageQualityError,
};
