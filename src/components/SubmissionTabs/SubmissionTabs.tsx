import styles from './SubmissionTabs.module.css';

export type SubmissionMode = 'sample' | 'image';

interface SubmissionTabsProps {
  active: SubmissionMode;
  onChange: (mode: SubmissionMode) => void;
}

export function SubmissionTabs({ active, onChange }: SubmissionTabsProps) {
  return (
    <div className={styles.tabs} role="tablist" aria-label="Submission type">
      <button
        type="button"
        role="tab"
        aria-selected={active === 'sample'}
        className={`${styles.tab} ${active === 'sample' ? styles.tabActive : ''}`}
        onClick={() => onChange('sample')}
      >
        Sample
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={active === 'image'}
        className={`${styles.tab} ${active === 'image' ? styles.tabActive : ''}`}
        onClick={() => onChange('image')}
      >
        Photo
      </button>
    </div>
  );
}
