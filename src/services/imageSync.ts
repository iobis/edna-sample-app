import { SampleImage } from '../types/sample';
import {
  getUnsyncedImages,
  isRecoverableImageBlob,
  markImageAsSynced,
  pruneUnrecoverableImages,
} from './images';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://platform.ednaexpeditions.org/api';

export interface ImageSyncResult {
  success: boolean;
  synced: number;
  pruned?: number;
  error?: {
    status?: number;
    message: string;
  };
}

function imageUploadDiagnostics(image: SampleImage) {
  const blob = image.blob;
  return {
    id: image.id,
    size: image.size,
    storedSize: blob instanceof Blob ? blob.size : null,
    mimeType: image.mimeType,
    blobType: blob instanceof Blob ? blob.type : typeof blob,
    hasSubmissionKey: Boolean(image.submissionKey),
    filename: image.filename,
  };
}

async function readErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const data = await response.json();
    if (typeof data?.error === 'string' && data.error) {
      return data.error;
    }
    if (data?.errors) {
      return JSON.stringify(data.errors);
    }
  } catch {
    // ignore non-JSON bodies
  }
  return fallback;
}

/**
 * Upload a single image to the API
 */
export async function syncImage(image: SampleImage): Promise<ImageSyncResult> {
  if (!navigator.onLine) {
    return { success: false, synced: 0, error: { message: 'No internet connection' } };
  }

  if (!isRecoverableImageBlob(image.blob)) {
    console.warn('Image sync skipped: local image data missing or empty', imageUploadDiagnostics(image));
    return {
      success: false,
      synced: 0,
      error: {
        message:
          'Local image data is missing or empty and cannot be uploaded. Re-take the photo if needed. Your samples are already saved.',
      },
    };
  }

  try {
    console.info('Image sync uploading', imageUploadDiagnostics(image));

    const formData = new FormData();
    const filename = image.filename || 'image.jpg';
    const file =
      image.blob instanceof File
        ? image.blob
        : new File([image.blob], filename, {
            type: image.mimeType || image.blob.type || 'application/octet-stream',
          });
    formData.append('image', file, filename);
    formData.append('latitude', String(image.latitude));
    formData.append('longitude', String(image.longitude));
    if (image.sampleId) {
      formData.append('sampleId', image.sampleId);
    }
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
      const detail = await readErrorMessage(
        response,
        response.statusText || 'Unknown error'
      );
      return {
        success: false,
        synced: 0,
        error: {
          status,
          message: `Image upload failed (${status}): ${detail}. Your samples are already saved — do not clear local data. Tap Sync again or contact helpdesk@obis.org if this persists.`,
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

  const pruned = await pruneUnrecoverableImages();

  const unsyncedImages = await getUnsyncedImages();

  if (unsyncedImages.length === 0) {
    return { success: true, synced: 0, pruned };
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
    success: syncedCount > 0 || (pruned > 0 && !lastError),
    synced: syncedCount,
    pruned,
    error: syncedCount === 0 ? lastError : undefined,
  };
}
