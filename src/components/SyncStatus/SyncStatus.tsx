import { useState, useEffect, useRef, useCallback } from 'react';
import { getSyncStats, syncSamples, clearAllData, SyncStats } from '../../services/sync';
import { syncAllImages } from '../../services/imageSync';
import { pruneUnrecoverableImages } from '../../services/images';
import { db } from '../../services/db';
import { useOffline } from '../../hooks/useOffline';
import styles from './SyncStatus.module.css';

interface SyncStatusProps {
  onError?: (message: string) => void;
  onSuccess?: (syncedCount: number, type?: 'sample' | 'image') => void;
  onInfo?: (message: string) => void;
}

function pluralize(count: number, singular: string, plural: string) {
  return count === 1 ? singular : plural;
}

export function SyncStatus({ onError, onSuccess, onInfo }: SyncStatusProps) {
  const [stats, setStats] = useState<SyncStats>({ synced: 0, queued: 0, syncedImages: 0, queuedImages: 0 });
  const [sampleIds, setSampleIds] = useState<string[]>([]);
  const [showSampleIds, setShowSampleIds] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const isOffline = useOffline();
  const previousQueuedRef = useRef<number>(0);
  const previousQueuedImagesRef = useRef<number>(0);
  const isSyncingRef = useRef(false);
  const pruneOnMountDoneRef = useRef(false);

  const updateStats = useCallback(async () => {
    const [newStats, samples] = await Promise.all([
      getSyncStats(),
      db.samples.orderBy('createdAt').reverse().toArray(),
    ]);
    setStats(newStats);
    setSampleIds(samples.map((sample) => sample.sampleId));
  }, []);

  const notifyPruned = useCallback(
    (pruned: number) => {
      if (pruned <= 0) return;
      onInfo?.(
        `Removed ${pruned} picture${pruned > 1 ? 's' : ''} that could no longer be uploaded. Re-take photos if needed. Your samples are already saved.`
      );
    },
    [onInfo]
  );

  const performSync = useCallback(async () => {
    if (isOffline || isSyncingRef.current) return;
    
    isSyncingRef.current = true;
    setSyncing(true);
    try {
      // Sync samples first
      const result = await syncSamples();
      await updateStats();
      
      // Then sync images (prunes empty blobs first)
      const imageResult = await syncAllImages();
      await updateStats();

      if (imageResult.pruned) {
        notifyPruned(imageResult.pruned);
      }
      
      // Report success/error for samples
      if (result.success && result.synced > 0 && onSuccess) {
        onSuccess(result.synced, 'sample');
      } else if (!result.success && result.error && onError) {
        onError(result.error.message);
      }
      
      // Samples OK but pictures failed — keep local data
      if (
        result.success &&
        !imageResult.success &&
        imageResult.error &&
        imageResult.synced === 0 &&
        onError
      ) {
        onError(
          `${imageResult.error.message} Do not tap Clear data — queued pictures stay on this phone until Sync succeeds.`
        );
      } else if (!imageResult.success && imageResult.error && imageResult.synced === 0 && onError) {
        onError(imageResult.error.message);
      } else if (imageResult.success && imageResult.synced > 0 && onSuccess) {
        onSuccess(imageResult.synced, 'image');
      }
    } catch (error) {
      // Silently fail - error handling is done in syncSamples and syncAllImages
    } finally {
      isSyncingRef.current = false;
      setSyncing(false);
    }
  }, [isOffline, updateStats, onSuccess, onError, notifyPruned]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!pruneOnMountDoneRef.current) {
        pruneOnMountDoneRef.current = true;
        try {
          const pruned = await pruneUnrecoverableImages();
          if (!cancelled && pruned > 0) {
            notifyPruned(pruned);
          }
        } catch (error) {
          console.error('Error pruning unrecoverable images:', error);
        }
      }
      if (!cancelled) {
        await updateStats();
      }
    })();
    const interval = setInterval(updateStats, 2000); // Update every 2 seconds
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [updateStats, notifyPruned]);

  // Auto-sync when a new sample or image is queued
  useEffect(() => {
    const samplesQueued = stats.queued > previousQueuedRef.current && stats.queued > 0;
    const imagesQueued = stats.queuedImages > previousQueuedImagesRef.current && stats.queuedImages > 0;

    if (!isOffline && !isSyncingRef.current && (samplesQueued || imagesQueued)) {
      performSync();
    }
    previousQueuedRef.current = stats.queued;
    previousQueuedImagesRef.current = stats.queuedImages;
  }, [stats.queued, stats.queuedImages, isOffline, performSync]);

  useEffect(() => {
    if (sampleIds.length === 0) {
      setShowSampleIds(false);
    }
  }, [sampleIds.length]);

  const handleSync = async () => {
    await performSync();
  };

  const handleClearData = async () => {
    const hasData =
      stats.synced > 0 ||
      stats.queued > 0 ||
      stats.syncedImages > 0 ||
      stats.queuedImages > 0;

    if (!hasData) return;

    const confirmed = window.confirm(
      'This will delete all locally stored samples and images on this device. Pictures that have not synced yet will be lost forever. Samples already on the server are kept, but you would need to re-take photos. Continue?'
    );
    if (!confirmed) return;

    try {
      await clearAllData();
      await updateStats();
    } catch (error) {
      console.error('Error clearing local data:', error);
      onError?.('Failed to clear local data.');
    }
  };

  const totalSamples = stats.synced + stats.queued;
  const totalImages = stats.syncedImages + stats.queuedImages;
  const samplesPending = stats.synced < totalSamples;
  const imagesPending = stats.syncedImages < totalImages;
  const hasData =
    stats.synced > 0 ||
    stats.queued > 0 ||
    stats.syncedImages > 0 ||
    stats.queuedImages > 0;

  return (
    <div className={styles.syncStatus}>
      <p className={styles.statusMessage}>
        You are{' '}
        <span className={`${styles.connectionStatus} ${isOffline ? styles.offline : styles.online}`}>
          {isOffline ? 'offline' : 'online'}
        </span>
        .{' '}
        <span className={`${styles.count} ${samplesPending ? styles.countPending : ''}`}>
          {stats.synced}/{totalSamples}
        </span>{' '}
        {pluralize(totalSamples, 'sample', 'samples')} and{' '}
        <span className={`${styles.count} ${imagesPending ? styles.countPending : ''}`}>
          {stats.syncedImages}/{totalImages}
        </span>{' '}
        {pluralize(totalImages, 'image', 'images')} you registered have been successfully
        submitted to our platform.
        {isOffline && (
          <> Reopen the app when your connection has been restored.</>
        )}
      </p>
      {sampleIds.length > 0 && (
        <div className={styles.sampleIdsSection}>
          <p className={styles.sampleIdsPrompt}>
            <button
              type="button"
              className={styles.sampleIdsToggle}
              onClick={() => setShowSampleIds((open) => !open)}
              aria-expanded={showSampleIds}
            >
              Click here
            </button>{' '}
            to {showSampleIds ? 'hide' : 'see'} the submitted sample identifiers.
          </p>
          {showSampleIds && (
            <ul className={styles.sampleIdsList}>
              {sampleIds.map((sampleId, index) => (
                <li key={`${sampleId}-${index}`}>{sampleId}</li>
              ))}
            </ul>
          )}
        </div>
      )}
      <div className={styles.actions}>
        {!isOffline && (stats.queued > 0 || stats.queuedImages > 0) && (
          <button
            onClick={handleSync}
            disabled={syncing}
            className={styles.syncButton}
          >
            {syncing ? 'Synchronizing...' : 'Synchronize'}
          </button>
        )}
        {hasData && (
          <button
            type="button"
            onClick={handleClearData}
            className={styles.clearButton}
          >
            Clear data
          </button>
        )}
      </div>
    </div>
  );
}
