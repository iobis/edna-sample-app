import { db } from './db';
import { SampleImage } from '../types/sample';
import { v4 as uuidv4 } from 'uuid';

export interface SaveImageOptions {
  file: File;
  latitude: number;
  longitude: number;
  sampleId?: string;
  submissionKey?: string;
}

/** True when IndexedDB still holds uploadable image bytes. */
export function isRecoverableImageBlob(blob: unknown): blob is Blob {
  return blob instanceof Blob && blob.size > 0;
}

/**
 * Copy camera File bytes into a plain Blob so IndexedDB does not keep a
 * live File handle that can go stale on iOS Safari.
 */
export async function normalizeImageBlob(file: Blob): Promise<Blob> {
  if (!(file instanceof Blob) || file.size === 0) {
    throw new Error('Image file is empty or missing');
  }
  const buffer = await file.arrayBuffer();
  const type = file.type || 'application/octet-stream';
  return new Blob([buffer], { type });
}

/**
 * Save an image file to IndexedDB, optionally linked to a sample
 */
export async function saveImage(options: SaveImageOptions): Promise<SampleImage> {
  const { file, latitude, longitude, sampleId, submissionKey } = options;
  if (!file || file.size === 0) {
    throw new Error('Image file is empty or missing');
  }

  const blob = await normalizeImageBlob(file);
  const now = new Date();
  const image: SampleImage = {
    id: uuidv4(),
    sampleId,
    submissionKey,
    latitude,
    longitude,
    blob,
    filename: file.name || 'image.jpg',
    mimeType: file.type || blob.type,
    size: blob.size,
    synced: false,
    createdAt: now,
    updatedAt: now,
  };

  await db.images.add(image);
  return image;
}

/**
 * Retrieve an image by sample ID
 */
export async function getImageBySampleId(sampleId: string): Promise<SampleImage | undefined> {
  // Get the most recent image for this sample (in case there are multiple)
  const images = await db.images
    .where('sampleId')
    .equals(sampleId)
    .sortBy('createdAt');
  
  return images.length > 0 ? images[images.length - 1] : undefined;
}

/**
 * Retrieve an image by image ID
 */
export async function getImageById(imageId: string): Promise<SampleImage | undefined> {
  return await db.images.get(imageId);
}

/**
 * Delete an image from IndexedDB
 */
export async function deleteImage(imageId: string): Promise<void> {
  await db.images.delete(imageId);
}

/**
 * Get all unsynced images for sync process
 */
export async function getUnsyncedImages(): Promise<SampleImage[]> {
  const allImages = await db.images.toArray();
  return allImages.filter(img => !img.synced);
}

/**
 * Mark an image as synced
 */
export async function markImageAsSynced(imageId: string): Promise<void> {
  await db.images.update(imageId, { 
    synced: true, 
    updatedAt: new Date() 
  });
}

/**
 * Delete local image rows whose blobs can never be uploaded.
 * Does not delete rows with size > 0 (including failed network uploads).
 * Does not touch sample rows.
 */
export async function pruneUnrecoverableImages(): Promise<number> {
  const allImages = await db.images.toArray();
  let pruned = 0;
  for (const image of allImages) {
    if (isRecoverableImageBlob(image.blob)) {
      continue;
    }
    await db.images.delete(image.id);
    pruned += 1;
  }
  return pruned;
}
