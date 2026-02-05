import { useState, useRef, useEffect } from 'react';
import styles from './ImageCapture.module.css';

interface ImageCaptureProps {
  onImageChange?: (file: File | null) => void;
  value?: File | null;
}

export function ImageCapture({ onImageChange, value }: ImageCaptureProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync with value prop
  useEffect(() => {
    if (value) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(value);
      setImageSize(value.size);
    } else {
      setPreview(null);
      setImageSize(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [value]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }

      // Warn if file is very large (>10MB)
      if (file.size > 10 * 1024 * 1024) {
        const proceed = confirm(
          `Image is large (${(file.size / 1024 / 1024).toFixed(2)}MB). Continue?`
        );
        if (!proceed) {
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
          return;
        }
      }

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      setImageSize(file.size);
      onImageChange?.(file);
    } else {
      setPreview(null);
      setImageSize(null);
      onImageChange?.(null);
    }
  };

  const handleRemove = () => {
    setPreview(null);
    setImageSize(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onImageChange?.(null);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
  };

  return (
    <div className={styles.imageCapture}>
      <label className={styles.label}>Field Sampling Sheet Photo</label>
      <div className={styles.container}>
        {preview ? (
          <div className={styles.previewContainer}>
            <img src={preview} alt="Preview" className={styles.preview} />
            <div className={styles.previewInfo}>
              <span className={styles.fileSize}>
                {imageSize !== null && formatFileSize(imageSize)}
              </span>
              <button
                type="button"
                onClick={handleRemove}
                className={styles.removeButton}
              >
                Remove
              </button>
            </div>
          </div>
        ) : (
          <div className={styles.uploadArea}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className={styles.fileInput}
              id="image-capture-input"
            />
            <label htmlFor="image-capture-input" className={styles.uploadLabel}>
              <span className={styles.uploadIcon}>📷</span>
              <span className={styles.uploadText}>
                Tap to take photo or select image
              </span>
            </label>
          </div>
        )}
      </div>
    </div>
  );
}

