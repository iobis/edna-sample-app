import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

vi.mock('./images', async () => {
  const actual = await vi.importActual<typeof import('./images')>('./images');
  return {
    ...actual,
    markImageAsSynced: vi.fn(async () => undefined),
    pruneUnrecoverableImages: vi.fn(async () => 0),
    getUnsyncedImages: vi.fn(async () => []),
  };
});

import { syncImage } from './imageSync';
import { markImageAsSynced } from './images';
import type { SampleImage } from '../types/sample';

describe('syncImage FormData', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.stubGlobal('navigator', { onLine: true });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.clearAllMocks();
  });

  it('POSTs multipart with a non-empty image file part', async () => {
    let received: FormData | null = null;
    globalThis.fetch = vi.fn(async (_url, init) => {
      received = init?.body as FormData;
      return new Response(JSON.stringify({ success: true, image_id: 1 }), { status: 200 });
    }) as typeof fetch;

    const image: SampleImage = {
      id: 'img-1',
      latitude: 1,
      longitude: 2,
      blob: new Blob([new Uint8Array([9, 8, 7])], { type: 'image/jpeg' }),
      filename: 'bag.jpg',
      mimeType: 'image/jpeg',
      size: 3,
      synced: false,
      submissionKey: 'sub-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await syncImage(image);
    expect(result.success).toBe(true);
    expect(received).toBeInstanceOf(FormData);
    const file = received!.get('image');
    expect(file).toBeInstanceOf(Blob);
    expect((file as Blob).size).toBe(3);
    expect(received!.get('submission_key')).toBe('sub-1');
    expect(markImageAsSynced).toHaveBeenCalledWith('img-1');
  });

  it('skips API when blob is empty', async () => {
    globalThis.fetch = vi.fn() as typeof fetch;
    const image: SampleImage = {
      id: 'img-2',
      latitude: 1,
      longitude: 2,
      blob: new Blob([]),
      filename: 'empty.jpg',
      mimeType: 'image/jpeg',
      size: 0,
      synced: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const result = await syncImage(image);
    expect(result.success).toBe(false);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});
