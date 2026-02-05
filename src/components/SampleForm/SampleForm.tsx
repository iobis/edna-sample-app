import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { SampleFormData } from '../../types/sample';
import { useLocation } from '../../hooks/useLocation';
import { calculateUncertainty } from '../../services/location';
import { useSamples } from '../../hooks/useSamples';
import { MapView } from '../MapView/MapView';
import { TextField, TextFieldInput, TextFieldTextarea } from '../ui/TextField';
import styles from './SampleForm.module.css';

interface SampleFormProps {
  onSuccess?: () => void;
}

export function SampleForm({ onSuccess }: SampleFormProps) {
  const { location, loading: locationLoading, error: locationError, refresh: refreshLocation } = useLocation();
  const { createSample } = useSamples();
  const [submitting, setSubmitting] = useState(false);

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

  const onSubmit = async (data: SampleFormData) => {
    setSubmitting(true);

    try {
      await createSample(data);
      
      // Preserve contact and locality, clear sample ID, volume, and remarks
      reset({
        contactName: data.contactName,
        contactEmail: data.contactEmail,
        locality: data.locality,
        dateTime: new Date().toISOString().slice(0, 16),
        sampleId: '',
        volumeFiltered: undefined,
        waterTemperature: undefined,
        remarks: undefined,
        coordinateUncertainty: undefined,
      });
      
      // Refresh location for next sample
      if (location) {
        refreshLocation();
      }
      
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
      <h2 className={styles.title}>Sample Metadata</h2>

      <TextField id="sampleId" label="Sample ID" error={errors.sampleId?.message} required>
        <TextFieldInput
          id="sampleId"
          {...register('sampleId', {
            required: 'Sample ID is required',
          })}
          placeholder="Enter sample ID from kit"
        />
      </TextField>

      <TextField id="contactName" label="Contact Name" error={errors.contactName?.message} required>
        <TextFieldInput
          id="contactName"
          {...register('contactName', {
            required: 'Contact name is required',
          })}
          placeholder="Your name"
        />
      </TextField>

      <TextField id="contactEmail" label="Contact Email" error={errors.contactEmail?.message} required>
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

      <TextField id="dateTime" label="Date & Time" error={errors.dateTime?.message} required>
        <TextFieldInput
          id="dateTime"
          type="datetime-local"
          {...register('dateTime', {
            required: 'Date and time are required',
          })}
        />
      </TextField>

      <TextField id="volumeFiltered" label="Volume Filtered (milliliters)" error={errors.volumeFiltered?.message} required>
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

      <TextField id="waterTemperature" label="Water Temperature (°C)" error={errors.waterTemperature?.message}>
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

      <TextField id="locality" label="Locality" error={errors.locality?.message}>
        <TextFieldInput
          id="locality"
          {...register('locality')}
          placeholder="Location description"
        />
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

      <TextField id="remarks" label="Remarks" error={errors.remarks?.message}>
        <p>Add any remarks on the sampling or the environment (habitat, sea state, water depth) here.</p>
        <TextFieldTextarea
          id="remarks"
          {...register('remarks')}
          placeholder="Additional remarks"
          rows={4}
        />
      </TextField>

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

