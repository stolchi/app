import { API_URL } from '@/shared/api/client';

/** Uploaded files are served by the API, under a path relative to it. */
export const assetUrl = (path: string) =>
  path.startsWith('/') ? `${API_URL}${path}` : path;

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const IMAGE_ACCEPT = IMAGE_TYPES.join(',');

/** Returns the i18n key of what is wrong with the file, if anything. */
export function imageProblem(file: File): string | null {
  if (!IMAGE_TYPES.includes(file.type)) return 'common.errors.badImage';
  if (file.size > MAX_IMAGE_BYTES) return 'common.errors.imageTooLarge';
  return null;
}

export function saveBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
