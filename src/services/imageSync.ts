import { SampleImage } from '../types/sample';
import { getUnsyncedImages, markImageAsSynced } from './images';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://platform.ednaexpeditions.org/api';

export interface ImageSyncResult {
  success: boolean;
  synced: number;
  error?: {
    status?: number;
    message: string;
  };
}

/**
 * Upload a single image to the API
 */
export async function syncImage(image: SampleImage): Promise<ImageSyncResult> {
  if (!navigator.onLine) {
    return { success: false, synced: 0, error: { message: 'No internet connection' } };
  }

  try {
    // Create FormData with image and sampleId
    const formData = new FormData();
    formData.append('image', image.blob, image.filename);
    formData.append('sampleId', image.sampleId);
    if (image.submissionKey) {
      formData.append('submission_key', image.submissionKey);
    }

    // Upload to API endpoint
    // Using POST /api/images with sampleId in FormData (alternative approach)
    const response = await fetch(`${API_BASE_URL}/images`, {
      method: 'POST',
      body: formData,
      // Don't set Content-Type header - browser will set it with boundary for multipart/form-data
    });

    if (!response.ok) {
      const status = response.status;
      return {
        success: false,
        synced: 0,
        error: {
          status,
          message: `Image upload failed (${status}): ${response.statusText || 'Unknown error'}, please contact helpdesk@obis.org if the error persists.`,
        },
      };
    }

    // Mark image as synced
    await markImageAsSynced(image.id);

    return { success: true, synced: 1 };
  } catch (error) {
    console.error('Image sync error:', error);
    return {
      success: false,
      synced: 0,
      error: {
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      },
    };
  }
}

/**
 * Sync all unsynced images
 */
export async function syncAllImages(): Promise<ImageSyncResult> {
  if (!navigator.onLine) {
    return { success: false, synced: 0, error: { message: 'No internet connection' } };
  }

  const unsyncedImages = await getUnsyncedImages();

  if (unsyncedImages.length === 0) {
    return { success: true, synced: 0 };
  }

  let syncedCount = 0;
  let lastError: ImageSyncResult['error'] | undefined;

  // Sync images one by one
  for (const image of unsyncedImages) {
    const result = await syncImage(image);
    if (result.success) {
      syncedCount++;
    } else {
      lastError = result.error;
      // Continue with other images even if one fails
    }
  }

  return {
    success: syncedCount > 0,
    synced: syncedCount,
    error: syncedCount === 0 ? lastError : undefined,
  };
}
