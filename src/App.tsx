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

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <h1 className={styles.title}>eDNA Expeditions submission</h1>
      </header>
      <main className={styles.main}>
        <SyncStatus 
          onError={(message) => showToast(message, 'error', 6000)} 
          onSuccess={(count, type) => {
            if (type === 'image') {
              showToast(`${count} image${count > 1 ? 's' : ''} synced successfully!`, 'success');
            } else {
              showToast(`${count} sample${count > 1 ? 's' : ''} synced successfully!`, 'success');
            }
          }} 
        />
        <SubmissionTabs active={submissionMode} onChange={setSubmissionMode} />
        {submissionMode === 'sample' ? (
          <SampleForm onSuccess={() => showToast('Sample queued successfully!', 'success')} />
        ) : (
          <ImageForm onSuccess={() => showToast('Images queued successfully!', 'success')} />
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

