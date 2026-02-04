import { useState, useEffect } from 'react';
import { getSyncStats, syncSamples, SyncStats } from '../../services/sync';
import { useOffline } from '../../hooks/useOffline';
import styles from './SyncStatus.module.css';

interface SyncStatusProps {
  onError?: (message: string) => void;
}

export function SyncStatus({ onError }: SyncStatusProps) {
  const [stats, setStats] = useState<SyncStats>({ synced: 0, queued: 0 });
  const [syncing, setSyncing] = useState(false);
  const isOffline = useOffline();

  const updateStats = async () => {
    const newStats = await getSyncStats();
    setStats(newStats);
  };

  useEffect(() => {
    updateStats();
    const interval = setInterval(updateStats, 2000); // Update every 2 seconds
    return () => clearInterval(interval);
  }, []);

  // Update stats when connection status changes
  useEffect(() => {
    if (!isOffline && !syncing) {
      // When coming online, update stats and try to sync (only if not already syncing)
      updateStats();
      setSyncing(true);
      syncSamples().then((result) => {
        if (!result.success && result.error) {
          if (onError) {
            onError(result.error.message);
          }
        }
      }).catch(() => {
        // Silently fail
      }).finally(() => {
        setSyncing(false);
        updateStats();
      });
    } else {
      // When going offline, update stats to reflect current state
      updateStats();
    }
  }, [isOffline]); // Removed onError from dependencies to prevent loops

  const handleSync = async () => {
    if (isOffline || syncing) return;
    
    setSyncing(true);
    try {
      const result = await syncSamples();
      await updateStats();
      if (!result.success && result.error && onError) {
        onError(result.error.message);
      }
    } finally {
      setSyncing(false);
    }
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

