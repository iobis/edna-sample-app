import { useState } from 'react';
import { SampleForm } from './components/SampleForm/SampleForm';
import { ImageForm } from './components/ImageForm/ImageForm';
import { SyncStatus } from './components/SyncStatus/SyncStatus';
import { SubmissionTabs, SubmissionMode } from './components/SubmissionTabs/SubmissionTabs';
import { Toast } from './components/Toast/Toast';
import { useToast } from './hooks/useToast';
import styles from './App.module.css';

function App() {
  const { toast, showToast, hideToast } = useToast();
  const [submissionMode, setSubmissionMode] = useState<SubmissionMode>('sample');
  // Keep visited panels mounted so form/photo state survives tab switches
  const [visited, setVisited] = useState<Record<SubmissionMode, boolean>>({
    sample: true,
    image: false,
  });

  const handleModeChange = (mode: SubmissionMode) => {
    setSubmissionMode(mode);
    setVisited((prev) => (prev[mode] ? prev : { ...prev, [mode]: true }));
  };

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <h1 className={styles.title}>eDNA Expeditions submission</h1>
      </header>
      <main className={styles.main}>
        <SyncStatus 
          onError={(message) => showToast(message, 'error', 8000)}
          onInfo={(message) => showToast(message, 'info', 8000)}
          onSuccess={(count, type) => {
            if (type === 'image') {
              showToast(`${count} image${count > 1 ? 's' : ''} synced successfully!`, 'success');
            } else {
              showToast(`${count} sample${count > 1 ? 's' : ''} synced successfully!`, 'success');
            }
          }} 
        />
        <SubmissionTabs active={submissionMode} onChange={handleModeChange} />
        {visited.sample && (
          <div hidden={submissionMode !== 'sample'}>
            <SampleForm
              active={submissionMode === 'sample'}
              onSuccess={() => showToast('Sample queued successfully!', 'success')}
            />
          </div>
        )}
        {visited.image && (
          <div hidden={submissionMode !== 'image'}>
            <ImageForm onSuccess={() => showToast('Images queued successfully!', 'success')} />
          </div>
        )}
      </main>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onClose={hideToast}
        />
      )}
    </div>
  );
}

export default App;

