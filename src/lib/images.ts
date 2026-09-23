// Prepares a user-chosen image for the blocked page (needs a DOM: pages only, not the background)

import { UserError } from "./storage"

/** Longest side of the stored image; larger images are scaled down */
export const MAX_IMAGE_DIMENSION = 1920
/** Budget for the stored data URL (storage.local allows about 10MB in Chrome) */
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024

/** Size that fits within `max` on its longest side, keeping the aspect ratio */
export function fitWithin(width: number, height: number, max: number): { width: number; height: number } {
  const scale = Math.min(1, max / Math.max(width, height))
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) }
}

/** True if any pixel is not fully opaque (RGBA bytes) */
export function hasTransparency(rgba: Uint8ClampedArray): boolean {
  for (let i = 3; i < rgba.length; i += 4) {
    if (rgba[i]! < 255) {
      return true
    }
  }
  return false
}

/**
 * Encoding attempts, best first: PNG keeps transparency (smaller sizes as fallback),
 * JPEG steps down in quality before size.
 */
export function encodingAttempts(transparent: boolean): { type: string; quality?: number; scale: number }[] {
  return transparent
    ? [1, 0.75, 0.5, 0.35].map(scale => ({ type: "image/png", scale }))
    : [
        { type: "image/jpeg", quality: 0.85, scale: 1 },
        { type: "image/jpeg", quality: 0.7, scale: 1 },
        { type: "image/jpeg", quality: 0.7, scale: 0.75 },
        { type: "image/jpeg", quality: 0.6, scale: 0.5 },
      ]
}

/** Decode, resize and encode an image file as a data URL that fits the storage budget */
export async function prepareImage(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new UserError("Choose an image file (PNG, JPEG, GIF or WebP)")
  }

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    throw new UserError("This image couldn't be read. Try a PNG or JPEG.")
  }

  try {
    const size = fitWithin(bitmap.width, bitmap.height, MAX_IMAGE_DIMENSION)
    const canvas = document.createElement("canvas")
    const context = canvas.getContext("2d")
    if (!context) {
      throw new UserError("Your browser couldn't process the image")
    }

    canvas.width = size.width
    canvas.height = size.height
    context.drawImage(bitmap, 0, 0, size.width, size.height)
    const transparent = hasTransparency(context.getImageData(0, 0, size.width, size.height).data)

    for (const attempt of encodingAttempts(transparent)) {
      const scaled = fitWithin(size.width * attempt.scale, size.height * attempt.scale, MAX_IMAGE_DIMENSION)
      canvas.width = scaled.width
      canvas.height = scaled.height
      context.drawImage(bitmap, 0, 0, scaled.width, scaled.height)
      const dataUrl = canvas.toDataURL(attempt.type, attempt.quality)
      // "data:," is what toDataURL returns when encoding fails
      if (dataUrl.length > "data:,".length && dataUrl.length <= MAX_IMAGE_BYTES) {
        return dataUrl
      }
    }
    throw new UserError("This image is too large. Try a smaller one.")
  } finally {
    bitmap.close()
  }
}
