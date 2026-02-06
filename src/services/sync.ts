import { db } from './db';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://platform.ednaexpeditions.org/api';

export interface SyncStats {
  synced: number;
  queued: number;
  syncedImages: number;
  queuedImages: number;
}

export async function getSyncStats(): Promise<SyncStats> {
  const allSamples = await db.samples.toArray();
  const synced = allSamples.filter(s => s.synced).length;
  const queued = allSamples.filter(s => !s.synced).length;
  
  const allImages = await db.images.toArray();
  const syncedImages = allImages.filter(img => img.synced).length;
  const queuedImages = allImages.filter(img => !img.synced).length;
  
  return { synced, queued, syncedImages, queuedImages };
}

export async function clearAllData(): Promise<void> {
  await db.samples.clear();
  await db.images.clear();
}

export interface SyncResult {
  success: boolean;
  synced: number;
  error?: {
    status?: number;
    message: string;
  };
}

export async function syncSamples(): Promise<SyncResult> {
  if (!navigator.onLine) {
    return { success: false, synced: 0, error: { message: 'No internet connection' } };
  }

  // Use filter instead of where().equals() for boolean queries (IndexedDB doesn't handle boolean indexes well)
  const allSamples = await db.samples.toArray();
  const unsyncedSamples = allSamples.filter(s => !s.synced);

  if (unsyncedSamples.length === 0) {
    return { success: true, synced: 0 };
  }

  try {
    // Prepare samples for API (exclude internal fields, convert to snake_case)
    const samplesToSync = unsyncedSamples.map(sample => {
      const {
        sampleId,
        contactName,
        contactEmail,
        dateTime,
        volumeFiltered,
        waterTemperature,
        remarks,
        environmentRemarks,
        replicate,
        site,
        locality,
        longitude,
        latitude,
        coordinateUncertainty,
        imageId,
      } = sample;

      return {
        sample_id: sampleId,
        contact_name: contactName,
        contact_email: contactEmail,
        date_time: dateTime.toISOString(),
        volume_filtered: volumeFiltered ?? null,
        water_temperature: waterTemperature ?? null,
        remarks: remarks ?? null,
        environment_remarks: environmentRemarks ?? null,
        replicate: replicate ?? null,
        site: site ?? null,
        locality: locality ?? null,
        longitude,
        latitude,
        coordinate_uncertainty: coordinateUncertainty,
        image_id: imageId ?? null,
      };
    });

    const response = await fetch(`${API_BASE_URL}/samples`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ samples: samplesToSync }),
    });

    if (!response.ok) {
      const status = response.status;
      return {
        success: false,
        synced: 0,
        error: { 
          status, 
          message: `Sync failed (${status}): ${response.statusText || 'Unknown error'}, please contact helpdesk@obis.org if the error persists.` 
        }
      };
    }

    const result = await response.json();

    // Mark samples as synced
    if (result.success) {
      const now = new Date();
      await Promise.all(
        unsyncedSamples.map(sample =>
          db.samples.update(sample.id, { synced: true, updatedAt: now })
        )
      );
    }

    return { success: true, synced: unsyncedSamples.length };
  } catch (error) {
    console.error('Sync error:', error);
    return {
      success: false,
      synced: 0,
      error: { message: error instanceof Error ? error.message : 'Unknown error occurred' }
    };
  }
}

// Note: Auto-sync is handled by SyncStatus component to avoid duplicate calls

