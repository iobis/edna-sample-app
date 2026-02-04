import { SampleForm } from './components/SampleForm/SampleForm';
import { SyncStatus } from './components/SyncStatus/SyncStatus';
import { Toast } from './components/Toast/Toast';
import { useToast } from './hooks/useToast';
import styles from './App.module.css';

function App() {
  const { toast, showToast, hideToast } = useToast();

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <h1 className={styles.title}>eDNA Expeditions sample submission</h1>
      </header>
      <main className={styles.main}>
        <SyncStatus onError={(message) => showToast(message, 'error', 6000)} />
        <SampleForm onSuccess={() => showToast('Sample submitted successfully!', 'success')} />
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

