import { db } from './db';
import { SampleImage } from '../types/sample';
import { v4 as uuidv4 } from 'uuid';

/**
 * Save an image file to IndexedDB for a given sample
 */
export async function saveImage(sampleId: string, file: File): Promise<SampleImage> {
  const now = new Date();
  const image: SampleImage = {
    id: uuidv4(),
    sampleId,
    blob: file,
    filename: file.name,
    mimeType: file.type,
    size: file.size,
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

