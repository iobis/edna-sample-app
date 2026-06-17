import { useState, useRef, useEffect } from 'react';
import styles from './ImageCapture.module.css';

type SingleImageCaptureProps = {
  multiple?: false;
  onImageChange?: (file: File | null) => void;
  value?: File | null;
  inputId?: string;
};

type MultiImageCaptureProps = {
  multiple: true;
  onImageChange?: (files: File[]) => void;
  value?: File[];
  inputId?: string;
};

export type ImageCaptureProps = SingleImageCaptureProps | MultiImageCaptureProps;

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1024 / 1024).toFixed(2) + ' MB';
}

function validateImageFiles(files: File[]): File[] | null {
  for (const file of files) {
    if (!file.type.startsWith('image/')) {
      alert('Please select only image files');
      return null;
    }
  }

  const largeFiles = files.filter((file) => file.size > 10 * 1024 * 1024);
  if (largeFiles.length > 0) {
    const proceed = confirm(
      `${largeFiles.length} image${largeFiles.length > 1 ? 's are' : ' is'} larger than 10MB. Continue?`
    );
    if (!proceed) return null;
  }

  return files;
}

function SingleImageCapture({
  onImageChange,
  value,
  inputId = 'image-capture-input',
}: SingleImageCaptureProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      const validated = validateImageFiles([file]);
      if (!validated) {
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }

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

  return (
    <div className={styles.imageCapture}>
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
              id={inputId}
            />
            <label htmlFor={inputId} className={styles.uploadLabel}>
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

function MultiImageCapture({
  onImageChange,
  value = [],
  inputId = 'image-capture-input',
}: MultiImageCaptureProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<string[]>([]);

  useEffect(() => {
    const urls = value.map((file) => URL.createObjectURL(file));
    setPreviews(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [value]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (selected.length === 0) return;

    const validated = validateImageFiles(selected);
    if (!validated) return;

    onImageChange?.([...value, ...validated]);
  };

  const handleRemove = (index: number) => {
    onImageChange?.(value.filter((_, i) => i !== index));
  };

  return (
    <div className={styles.imageCapture}>
      <div className={styles.container}>
        <div className={styles.uploadArea}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileChange}
            className={styles.fileInput}
            id={inputId}
          />
          <label htmlFor={inputId} className={styles.uploadLabel}>
            <span className={styles.uploadIcon}>📷</span>
            <span className={styles.uploadText}>
              Tap to select photos
            </span>
          </label>
        </div>

        {value.length > 0 && (
          <div className={styles.previewGrid}>
            {value.map((file, index) => (
              <div key={`${file.name}-${file.size}-${file.lastModified}`} className={styles.previewItem}>
                <img src={previews[index]} alt={file.name} className={styles.previewThumb} />
                <div className={styles.previewInfo}>
                  <span className={styles.fileSize}>{formatFileSize(file.size)}</span>
                  <button
                    type="button"
                    onClick={() => handleRemove(index)}
                    className={styles.removeButton}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function ImageCapture(props: ImageCaptureProps) {
  if (props.multiple) {
    return <MultiImageCapture {...props} />;
  }
  return <SingleImageCapture {...props} />;
}
