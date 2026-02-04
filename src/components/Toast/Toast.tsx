import { useEffect } from 'react';
import styles from './Toast.module.css';

interface ToastProps {
  message: string;
  type?: 'success' | 'error';
  duration?: number;
  onClose: () => void;
}

export function Toast({ message, type = 'success', duration = 3000, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div className={`${styles.toast} ${styles[type]}`}>
      {message}
    </div>
  );
}

