import { useState, useEffect, useRef, useCallback } from 'react';
import { getSyncStats, syncSamples, SyncStats } from '../../services/sync';
import { useOffline } from '../../hooks/useOffline';
import styles from './SyncStatus.module.css';

interface SyncStatusProps {
  onError?: (message: string) => void;
  onSuccess?: (syncedCount: number) => void;
}

export function SyncStatus({ onError, onSuccess }: SyncStatusProps) {
  const [stats, setStats] = useState<SyncStats>({ synced: 0, queued: 0 });
  const [syncing, setSyncing] = useState(false);
  const isOffline = useOffline();
  const previousQueuedRef = useRef<number>(0);
  const isSyncingRef = useRef(false);

  const updateStats = useCallback(async () => {
    const newStats = await getSyncStats();
    setStats(newStats);
  }, []);

  const performSync = useCallback(async () => {
    if (isOffline || isSyncingRef.current) return;
    
    isSyncingRef.current = true;
    setSyncing(true);
    try {
      const result = await syncSamples();
      await updateStats();
      if (result.success && result.synced > 0 && onSuccess) {
        onSuccess(result.synced);
      } else if (!result.success && result.error && onError) {
        onError(result.error.message);
      }
    } catch (error) {
      // Silently fail - error handling is done in syncSamples
    } finally {
      isSyncingRef.current = false;
      setSyncing(false);
    }
  }, [isOffline, updateStats, onSuccess, onError]);

  useEffect(() => {
    updateStats();
    const interval = setInterval(updateStats, 2000); // Update every 2 seconds
    return () => clearInterval(interval);
  }, [updateStats]);

  // Auto-sync when coming online
  useEffect(() => {
    if (!isOffline && !isSyncingRef.current) {
      // When coming online, update stats and try to sync (only if not already syncing)
      updateStats();
      performSync();
    } else {
      // When going offline, update stats to reflect current state
      updateStats();
    }
  }, [isOffline, updateStats, performSync]);

  // Auto-sync when a new sample is queued (queued count increases)
  useEffect(() => {
    // Only sync if:
    // - We're online
    // - Not already syncing
    // - Queued count increased (new sample was added)
    // - There are actually queued samples
    if (!isOffline && !isSyncingRef.current && stats.queued > previousQueuedRef.current && stats.queued > 0) {
      performSync();
    }
    // Update the ref to track the previous queued count
    previousQueuedRef.current = stats.queued;
  }, [stats.queued, isOffline, performSync]);

  const handleSync = async () => {
    await performSync();
  };

  return (
    <div className={styles.syncStatus}>
      <div className={styles.header}>
        <div className={styles.statusIndicator}>
          <span className={`${styles.statusDot} ${isOffline ? styles.offline : styles.online}`} />
          <span className={styles.statusText}>
            {isOffline ? 'Offline' : 'Online'}
          </span>
        </div>
        {!isOffline && stats.queued > 0 && (
          <button
            onClick={handleSync}
            disabled={syncing}
            className={styles.syncButton}
          >
            {syncing ? 'Syncing...' : 'Sync'}
          </button>
        )}
      </div>
      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statValue}>{stats.synced}</span>
          <span className={styles.statLabel}>Synced</span>
        </div>
        <div className={`${styles.stat} ${stats.queued > 0 ? styles.statQueued : ''}`}>
          <span className={styles.statValue}>{stats.queued}</span>
          <span className={styles.statLabel}>Queued</span>
        </div>
      </div>
    </div>
  );
}

