import { describe, expect, it } from 'vitest';
import { isRecoverableImageBlob, normalizeImageBlob } from './images';

describe('isRecoverableImageBlob', () => {
  it('accepts non-empty Blob', () => {
    expect(isRecoverableImageBlob(new Blob(['jpeg'], { type: 'image/jpeg' }))).toBe(true);
  });

  it('rejects empty Blob', () => {
    expect(isRecoverableImageBlob(new Blob([]))).toBe(false);
  });

  it('rejects non-Blob values', () => {
    expect(isRecoverableImageBlob(undefined)).toBe(false);
    expect(isRecoverableImageBlob(null)).toBe(false);
    expect(isRecoverableImageBlob('not-a-blob')).toBe(false);
  });
});

describe('normalizeImageBlob', () => {
  it('copies bytes into a plain Blob', async () => {
    const file = new File([new Uint8Array([1, 2, 3])], 'a.jpg', { type: 'image/jpeg' });
    const blob = await normalizeImageBlob(file);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob).not.toBeInstanceOf(File);
    expect(blob.size).toBe(3);
    expect(blob.type).toBe('image/jpeg');
  });

  it('rejects empty files', async () => {
    await expect(normalizeImageBlob(new Blob([]))).rejects.toThrow(/empty or missing/);
  });
});
