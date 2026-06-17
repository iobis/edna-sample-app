import { useState } from 'react';
import { useLocation } from '../../hooks/useLocation';
import { getCurrentLocation } from '../../services/location';
import { ImageCapture } from '../ImageCapture/ImageCapture';
import { saveImage } from '../../services/images';
import styles from './ImageForm.module.css';

interface ImageFormProps {
  onSuccess?: () => void;
}

export function ImageForm({ onSuccess }: ImageFormProps) {
  const { location, refresh: refreshLocation } = useLocation();
  const [submitting, setSubmitting] = useState(false);
  const [images, setImages] = useState<File[]>([]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (images.length === 0) return;

    setSubmitting(true);

    try {
      let coords = location;
      if (!coords) {
        try {
          coords = await getCurrentLocation();
        } catch {
          // GPS unavailable; coordinates default to 0
        }
      }

      const latitude = coords
        ? Math.round(coords.latitude * 100000) / 100000
        : 0;
      const longitude = coords
        ? Math.round(coords.longitude * 100000) / 100000
        : 0;

      await Promise.all(
        images.map((file) =>
          saveImage({
            file,
            latitude,
            longitude,
          })
        )
      );

      setImages([]);
      refreshLocation();

      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;

      onSuccess?.();
    } catch (error) {
      console.error('Error saving image:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className={styles.form}>
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Photo</h2>
        <p>Submit a photo of the sampling process or the environment.</p>
        <ImageCapture
          multiple
          onImageChange={setImages}
          value={images}
          inputId="standalone-image-capture"
        />
      </div>

      <button
        type="submit"
        disabled={submitting || images.length === 0}
        className={styles.submitButton}
      >
        {submitting ? 'Submitting...' : `Submit image${images.length > 1 ? 's' : ''}`}
      </button>
    </form>
  );
}
