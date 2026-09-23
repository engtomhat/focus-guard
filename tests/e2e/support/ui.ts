// Functions that run inside an extension page (passed to page.evaluate() in Chromium,
// or serialized with .toString() for Firefox). They must be self-contained.

/** Draw an image on a canvas and "choose" it in a file input, like a user would */
export async function chooseGeneratedImage(options: { inputId: string; width: number; height: number; transparent: boolean }): Promise<number> {
  const { inputId, width, height, transparent } = options;
  const canvas = new OffscreenCanvas(width, height);
  const context = canvas.getContext('2d')!;
  const image = context.createImageData(width, height);
  // Noisy pixels so the encoded size is realistic; left half transparent if asked
  for (let i = 0; i < image.data.length; i += 4) {
    image.data[i] = (i * 7) % 256;
    image.data[i + 1] = (i * 13) % 256;
    image.data[i + 2] = (i * 29) % 256;
    image.data[i + 3] = transparent && (i / 4) % width < width / 2 ? 0 : 255;
  }
  context.putImageData(image, 0, 0);
  const blob = await canvas.convertToBlob({ type: 'image/png' });
  const transfer = new DataTransfer();
  transfer.items.add(new File([blob], 'image.png', { type: 'image/png' }));
  const input = document.getElementById(inputId) as HTMLInputElement;
  input.files = transfer.files;
  input.dispatchEvent(new Event('change'));
  return blob.size;
}

/** "Choose" a text file in a file input */
export function chooseTextFile(options: { inputId: string; name: string; type: string; content: string }): void {
  const transfer = new DataTransfer();
  transfer.items.add(new File([options.content], options.name, { type: options.type }));
  const input = document.getElementById(options.inputId) as HTMLInputElement;
  input.files = transfer.files;
  input.dispatchEvent(new Event('change'));
}

/** Type, size and byte length of the stored custom image, or null */
export async function storedImageInfo(): Promise<{ type: string; width: number; height: number; bytes: number } | null> {
  const api = (globalThis as any).browser ?? (globalThis as any).chrome; // eslint-disable-line @typescript-eslint/no-explicit-any
  const { blockedImage } = await api.storage.local.get('blockedImage');
  if (!blockedImage) {
    return null;
  }
  const image = new Image();
  image.src = blockedImage;
  await image.decode();
  return { type: blockedImage.slice(5, blockedImage.indexOf(';')), width: image.naturalWidth, height: image.naturalHeight, bytes: blockedImage.length };
}

/** Profiles as { name: domains } */
export async function profilesByName(): Promise<Record<string, string[]>> {
  const api = (globalThis as any).browser ?? (globalThis as any).chrome; // eslint-disable-line @typescript-eslint/no-explicit-any
  const all = await api.storage.sync.get(null);
  return Object.fromEntries(Object.entries(all)
    .filter(([key]) => key.startsWith('profile:'))
    .map(([, profile]) => [(profile as { name: string }).name, (profile as { domains: string[] }).domains]));
}

export const BACKUP_FILE = JSON.stringify({
  format: 'focus-guard-backup',
  version: 1,
  exportedAt: '2026-01-01T00:00:00Z',
  profiles: {
    default: { name: 'Default', domains: ['A.test', 'b.test'] },
    p9: { name: 'Evening', domains: ['tv.test', 'bad domain'] },
  },
});
