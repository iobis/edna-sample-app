import { db } from './db';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export interface SyncStats {
  synced: number;
  queued: number;
}

export async function getSyncStats(): Promise<SyncStats> {
  const allSamples = await db.samples.toArray();
  const synced = allSamples.filter(s => s.synced).length;
  const queued = allSamples.filter(s => !s.synced).length;
  
  return { synced, queued };
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
    // Prepare samples for API (exclude internal fields)
    const samplesToSync = unsyncedSamples.map(sample => {
      const { id, synced, createdAt, updatedAt, ...sampleData } = sample;
      return {
        ...sampleData,
        dateTime: sample.dateTime.toISOString()
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

