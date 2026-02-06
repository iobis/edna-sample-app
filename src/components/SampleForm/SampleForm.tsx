import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { SampleFormData } from '../../types/sample';
import { useLocation } from '../../hooks/useLocation';
import { calculateUncertainty } from '../../services/location';
import { useSamples } from '../../hooks/useSamples';
import { MapView } from '../MapView/MapView';
import { TextField, TextFieldInput, TextFieldTextarea } from '../ui/TextField';
import { ImageCapture } from '../ImageCapture/ImageCapture';
import { saveImage } from '../../services/images';
import { db } from '../../services/db';
import styles from './SampleForm.module.css';

interface SampleFormProps {
  onSuccess?: () => void;
}

export function SampleForm({ onSuccess }: SampleFormProps) {
  const { location, loading: locationLoading, error: locationError, refresh: refreshLocation } = useLocation();
  const { createSample } = useSamples();
  const [submitting, setSubmitting] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [siteSuggestions, setSiteSuggestions] = useState<string[]>([]);
  const [localitySuggestions, setLocalitySuggestions] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<SampleFormData>({
    defaultValues: {
      dateTime: new Date().toISOString().slice(0, 16), // Local datetime format
      volumeFiltered: undefined,
      waterTemperature: undefined,
      coordinateUncertainty: undefined,
    },
  });

  const latitude = watch('latitude');
  const longitude = watch('longitude');
  const uncertainty = watch('coordinateUncertainty');

  // Update form with location when available
  useEffect(() => {
    if (location) {
      // Round to 5 decimal places
      const roundedLat = Math.round(location.latitude * 100000) / 100000;
      const roundedLng = Math.round(location.longitude * 100000) / 100000;
      setValue('latitude', roundedLat);
      setValue('longitude', roundedLng);
      const uncertainty = calculateUncertainty(location.accuracy);
      if (uncertainty !== undefined) {
        setValue('coordinateUncertainty', uncertainty);
      }
    }
  }, [location, setValue]);

  // Load site and locality suggestions from existing samples
  useEffect(() => {
    const loadSuggestions = async () => {
      try {
        const samples = await db.samples.toArray();
        const siteSet = new Set<string>();
        const localitySet = new Set<string>();

        for (const sample of samples) {
          if (sample.site) {
            siteSet.add(sample.site);
          }
          if (sample.locality) {
            localitySet.add(sample.locality);
          }
        }

        setSiteSuggestions(Array.from(siteSet).sort());
        setLocalitySuggestions(Array.from(localitySet).sort());
      } catch (error) {
        console.error('Error loading site/locality suggestions:', error);
      }
    };

    loadSuggestions();
  }, []);

  const onSubmit = async (data: SampleFormData) => {
    setSubmitting(true);

    try {
      // Create sample first to get the sampleId
      const sample = await createSample(data);
      
      // If an image was selected, save it to IndexedDB
      if (selectedImage) {
        try {
          await saveImage(sample.sampleId, selectedImage);
        } catch (imageError) {
          console.error('Error saving image:', imageError);
          // Continue even if image save fails - sample is already created
        }
      }
      
      // Preserve contact, site, and locality, clear sample ID, volume, replicate, temperature, and comments
      reset({
        contactName: data.contactName,
        contactEmail: data.contactEmail,
        site: data.site,
        locality: data.locality,
        dateTime: new Date().toISOString().slice(0, 16),
        sampleId: '',
        volumeFiltered: '' as any,
        waterTemperature: '' as any,
        remarks: '',
        environmentRemarks: '',
        replicate: '' as any,
        coordinateUncertainty: undefined,
      });

      // Update in-memory suggestions with newly used values
      if (data.site) {
        setSiteSuggestions((prev) =>
          prev.includes(data.site!) ? prev : [...prev, data.site!].sort()
        );
      }
      if (data.locality) {
        setLocalitySuggestions((prev) =>
          prev.includes(data.locality!) ? prev : [...prev, data.locality!].sort()
        );
      }
      
      // Clear selected image
      setSelectedImage(null);
      
      // Refresh location for next sample
      if (location) {
        refreshLocation();
      }
      
      // Scroll to top of page
      window.scrollTo({ top: 0, behavior: 'smooth' });
      
      // Show success toast
      onSuccess?.();
    } catch (error) {
      console.error('Error creating sample:', error);
      // Could add error toast here if needed
    } finally {
      setSubmitting(false);
    }
  };

  const handleMapLocationChange = (lat: number, lng: number) => {
    // Round to 5 decimal places
    const roundedLat = Math.round(lat * 100000) / 100000;
    const roundedLng = Math.round(lng * 100000) / 100000;
    setValue('latitude', roundedLat);
    setValue('longitude', roundedLng);
  };

  // Normalize number input: convert commas to dots and update form state
  const normalizeNumberInput = (e: React.ChangeEvent<HTMLInputElement> | React.FormEvent<HTMLInputElement>) => {
    const fieldName = e.currentTarget.name as keyof SampleFormData;
    const originalValue = e.currentTarget.value;
    const normalizedValue = originalValue.replace(/,/g, '.');
    
    // Update the input field value immediately
    if (normalizedValue !== originalValue) {
      e.currentTarget.value = normalizedValue;
      // Also update react-hook-form state
      setValue(fieldName, normalizedValue as any, { shouldValidate: false });
    }
  };

  // Handle input event (fires before validation) to catch commas immediately
  const handleNumberInput = (e: React.FormEvent<HTMLInputElement>) => {
    normalizeNumberInput(e);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Contact information</h2>

        <TextField id="contactName" label="Contact name" error={errors.contactName?.message} required>
          <TextFieldInput
            id="contactName"
            {...register('contactName', {
              required: 'Contact name is required',
            })}
            placeholder="Your name"
          />
        </TextField>

        <TextField id="contactEmail" label="Contact email" error={errors.contactEmail?.message} required>
          <TextFieldInput
            id="contactEmail"
            type="email"
            {...register('contactEmail', {
              required: 'Email is required',
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: 'Invalid email address',
              },
            })}
            placeholder="your.email@example.com"
          />
        </TextField>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Sample metadata</h2>

        <TextField id="sampleId" label="Sample ID" error={errors.sampleId?.message} required>
          <TextFieldInput
            id="sampleId"
            {...register('sampleId', {
              required: 'Sample ID is required',
            })}
            placeholder="Enter sample ID from kit"
          />
        </TextField>

        <TextField id="dateTime" label="Date & time" error={errors.dateTime?.message} required>
          <TextFieldInput
            id="dateTime"
            type="datetime-local"
            {...register('dateTime', {
              required: 'Date and time are required',
            })}
          />
        </TextField>

        <TextField id="volumeFiltered" label="Volume filtered (milliliters)" error={errors.volumeFiltered?.message} required>
          <TextFieldInput
            id="volumeFiltered"
            type="number"
            lang="en"
            inputMode="numeric"
            step="1"
            min="0"
            {...register('volumeFiltered', {
              required: 'Volume filtered is required',
              validate: (value) => {
                if (value !== undefined && value !== null && value < 0) {
                  return 'Volume must be positive';
                }
                return true;
              },
              valueAsNumber: true,
              onChange: normalizeNumberInput,
            })}
            placeholder="0"
          />
        </TextField>

        <TextField id="site" label="Site or project" error={errors.site?.message}>
          <p>If this sampling is part of a eDNA Expeditions sampling campaign or a project, add a standardized name for the site or project. For example "Aldabra Atoll" or "Scaglieri Bioblitz".</p>
          <TextFieldInput
            id="site"
            list="site-suggestions"
            {...register('site')}
            placeholder="Site name"
          />
          {siteSuggestions.length > 0 && (
            <datalist id="site-suggestions">
              {siteSuggestions.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          )}
        </TextField>

        <TextField id="locality" label="Locality" error={errors.locality?.message}>
          <p>Add a standardized name for the sampling location, for example "Oyster Point", "Pigeon Reef".</p>
          <TextFieldInput
            id="locality"
            list="locality-suggestions"
            {...register('locality')}
            placeholder="Location description"
          />
          {localitySuggestions.length > 0 && (
            <datalist id="locality-suggestions">
              {localitySuggestions.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          )}
        </TextField>

        <TextField id="replicate" label="Replicate" error={errors.replicate?.message}>
        <p>If you are taking multiple samples in the same location, select the replicate number for the sample. Use the same locality name and different replicate numbers for samples taken at the same location.</p>
        <select
            id="replicate"
            className={styles.select}
            defaultValue=""
            {...register('replicate', {
              setValueAs: (value) => (value === '' ? undefined : Number(value)),
            })}
          >
            <option value="">Select replicate</option>
            {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {`Replicate ${n}`}
              </option>
            ))}
          </select>
        </TextField>

        <div className={styles.locationSection}>
          <div className={styles.locationHeader}>
            <label className={styles.sectionLabel}>Location</label>
            <button
              type="button"
              onClick={refreshLocation}
              disabled={locationLoading}
              className={styles.refreshButton}
            >
              {locationLoading ? 'Getting location...' : 'Refresh GPS'}
            </button>
          </div>

          {locationError && (
            <div className={styles.errorMessage}>
              Location error, please enter coordinates manually or refresh GPS.
            </div>
          )}

          <div className={styles.coordinates}>
            <TextField id="latitude" label="Latitude" error={errors.latitude?.message} required>
              <TextFieldInput
                id="latitude"
                type="number"
                lang="en"
                inputMode="decimal"
                step="0.00001"
                {...register('latitude', {
                  required: 'Latitude is required',
                  min: { value: -90, message: 'Latitude must be between -90 and 90' },
                  max: { value: 90, message: 'Latitude must be between -90 and 90' },
                  valueAsNumber: true,
                  onChange: normalizeNumberInput,
                })}
                onInput={handleNumberInput}
                placeholder="0.00000"
              />
            </TextField>

            <TextField id="longitude" label="Longitude" error={errors.longitude?.message} required>
              <TextFieldInput
                id="longitude"
                type="number"
                lang="en"
                inputMode="decimal"
                step="0.00001"
                {...register('longitude', {
                  required: 'Longitude is required',
                  min: { value: -180, message: 'Longitude must be between -180 and 180' },
                  max: { value: 180, message: 'Longitude must be between -180 and 180' },
                  valueAsNumber: true,
                  onChange: normalizeNumberInput,
                })}
                onInput={handleNumberInput}
                placeholder="0.00000"
              />
            </TextField>

            <TextField id="coordinateUncertainty" label="Uncertainty (m)" error={errors.coordinateUncertainty?.message} required>
              <TextFieldInput
                id="coordinateUncertainty"
                type="number"
                lang="en"
                inputMode="numeric"
                step="1"
                min="0"
                {...register('coordinateUncertainty', {
                  required: 'Uncertainty is required',
                  min: { value: 0, message: 'Uncertainty must be positive' },
                  valueAsNumber: true,
                  onChange: normalizeNumberInput,
                })}
                onInput={handleNumberInput}
                placeholder="50"
              />
            </TextField>
          </div>

          {typeof latitude === 'number' && 
           typeof longitude === 'number' && 
           typeof uncertainty === 'number' &&
           !isNaN(latitude) && 
           !isNaN(longitude) && 
           !isNaN(uncertainty) && (
            <MapView
              latitude={latitude}
              longitude={longitude}
              uncertainty={uncertainty}
              onLocationChange={handleMapLocationChange}
              editable={true}
            />
          )}
        </div>

        <TextField id="remarks" label="General comments" error={errors.remarks?.message}>
          <p>Add any comments, for example if you experienced any difficulties with the sampling.</p>
          <TextFieldTextarea
            id="remarks"
            {...register('remarks')}
            placeholder="General comments"
            rows={3}
          />
        </TextField>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Environment</h2>

        <TextField id="waterTemperature" label="Water temperature (°C)" error={errors.waterTemperature?.message}>
          <TextFieldInput
            id="waterTemperature"
            type="number"
            lang="en"
            inputMode="decimal"
            step="0.1"
            {...register('waterTemperature', {
              valueAsNumber: true,
              onChange: normalizeNumberInput,
            })}
            placeholder=""
          />
        </TextField>

        <TextField
          id="environmentRemarks"
          label="Environment description"
          error={errors.environmentRemarks?.message}
        >
          <p>Describe the environment, this can include the habitat type, sea state, water depth, weather, etc.</p>
          <TextFieldTextarea
            id="environmentRemarks"
            {...register('environmentRemarks')}
            placeholder="Describe the environment"
            rows={3}
          />
        </TextField>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Sampling sheet</h2>

        <ImageCapture
          onImageChange={setSelectedImage}
          value={selectedImage}
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className={styles.submitButton}
      >
        {submitting ? 'Submitting...' : 'Submit Sample'}
      </button>
    </form>
  );
}

