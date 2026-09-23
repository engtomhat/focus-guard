import { describe, expect, it } from 'vitest';
import { MAX_IMAGE_DIMENSION, encodingAttempts, fitWithin, hasTransparency } from '@/lib/images';

describe('fitWithin', () => {
  it('keeps images that already fit', () => {
    expect(fitWithin(800, 600, MAX_IMAGE_DIMENSION)).toEqual({ width: 800, height: 600 });
  });

  it('scales the longest side down to the limit, keeping the aspect ratio', () => {
    expect(fitWithin(4000, 3000, 1920)).toEqual({ width: 1920, height: 1440 });
    expect(fitWithin(1000, 5000, 1920)).toEqual({ width: 384, height: 1920 });
  });

  it('never returns a zero dimension', () => {
    expect(fitWithin(10000, 1, 1920)).toEqual({ width: 1920, height: 1 });
  });
});

describe('hasTransparency', () => {
  it('detects any non-opaque pixel', () => {
    expect(hasTransparency(new Uint8ClampedArray([0, 0, 0, 255, 9, 9, 9, 255]))).toBe(false);
    expect(hasTransparency(new Uint8ClampedArray([0, 0, 0, 255, 9, 9, 9, 128]))).toBe(true);
  });
});

describe('encodingAttempts', () => {
  it('keeps PNG for transparent images (JPEG would turn transparency black)', () => {
    expect(encodingAttempts(true).every(a => a.type === 'image/png')).toBe(true);
  });

  it('uses JPEG for opaque images, lowering quality before size', () => {
    const attempts = encodingAttempts(false);
    expect(attempts.every(a => a.type === 'image/jpeg')).toBe(true);
    expect(attempts[0]).toEqual({ type: 'image/jpeg', quality: 0.85, scale: 1 });
    expect(attempts.at(-1)!.scale).toBeLessThan(1);
  });
});
