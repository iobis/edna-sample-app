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
import { v4 as uuidv4 } from 'uuid';
import { sanitizeCoordinateDraft, toggleCoordinateDraft } from './coordinateInput';
import styles from './SampleForm.module.css';

/** Format for `<input type="datetime-local">` using the device's local wall clock. */
function localDateTimeInputValue(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

interface SampleFormProps {
  onSuccess?: () => void;
  /** When false the form is hidden (e.g. another tab is active). Used to refresh the map layout. */
  active?: boolean;
}

export function SampleForm({ onSuccess, active = true }: SampleFormProps) {
  const { location, loading: locationLoading, error: locationError, refresh: refreshLocation } = useLocation();
  const { createSample } = useSamples();
  const [submitting, setSubmitting] = useState(false);
  const [bagImage, setBagImage] = useState<File | null>(null);
  const [sheetImage, setSheetImage] = useState<File | null>(null);
  const [siteSuggestions, setSiteSuggestions] = useState<string[]>([]);
  const [localitySuggestions, setLocalitySuggestions] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    getValues,
    reset,
  } = useForm<SampleFormData>({
    defaultValues: {
      dateTime: localDateTimeInputValue(), // Local datetime for datetime-local input
      volumeFiltered: undefined,
      filteringMethod: undefined,
      waterTemperature: undefined,
      coordinateUncertainty: undefined,
      control: false,
    },
  });

  const latitude = watch('latitude');
  const longitude = watch('longitude');
  const uncertainty = watch('coordinateUncertainty');
  const isControl = watch('control');

  useEffect(() => {
    if (isControl) {
      setValue('replicate', undefined);
    }
  }, [isControl, setValue]);

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
      const submissionKey = uuidv4();
      // Create sample first to get the sampleId
      const sample = await createSample(data, submissionKey);
      
      // If images were selected, save them to IndexedDB
      if (bagImage) {
        try {
          await saveImage({
            file: bagImage,
            latitude: data.latitude,
            longitude: data.longitude,
            sampleId: sample.sampleId,
            submissionKey,
          });
        } catch (imageError) {
          console.error('Error saving bag image:', imageError);
          // Continue even if image save fails - sample is already created
        }
      }

      if (sheetImage) {
        try {
          await saveImage({
            file: sheetImage,
            latitude: data.latitude,
            longitude: data.longitude,
            sampleId: sample.sampleId,
            submissionKey,
          });
        } catch (imageError) {
          console.error('Error saving sheet image:', imageError);
          // Continue even if image save fails - sample is already created
        }
      }
      
      // Preserve contact, site, and locality, clear sample ID, volume, replicate, temperature, and comments
      reset({
        contactName: data.contactName,
        contactEmail: data.contactEmail,
        site: data.site,
        locality: data.locality,
        dateTime: localDateTimeInputValue(),
        sampleId: '',
        volumeFiltered: '' as any,
        filteringMethod: '' as any,
        waterTemperature: '' as any,
        remarks: '',
        environmentRemarks: '',
        replicate: '' as any,
        control: false,
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
      
      // Clear selected images
      setBagImage(null);
      setSheetImage(null);
      
      // Refresh location for next sample
      if (location) {
        refreshLocation();
      }
      
      // Scroll to very top of page
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      
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

  // Latitude/longitude use the normal keyboard so "-" can be typed. A typed
  // minus is kept and moved to the front of the number.
  const handleCoordinateInput = (
    e: React.ChangeEvent<HTMLInputElement> | React.FormEvent<HTMLInputElement>,
  ) => {
    const input = e.currentTarget;
    const fieldName = input.name as 'latitude' | 'longitude';
    const sanitized = sanitizeCoordinateDraft(input.value);
    if (sanitized === input.value) return;

    const cursor = input.selectionStart ?? sanitized.length;
    const delta = input.value.length - sanitized.length;
    input.value = sanitized;
    setValue(fieldName, sanitized as unknown as number, { shouldValidate: false });
    const nextCursor = Math.max(0, cursor - delta);
    input.setSelectionRange(nextCursor, nextCursor);
  };

  const toggleCoordinateSign = (field: 'latitude' | 'longitude') => {
    const input = document.getElementById(field);
    if (!(input instanceof HTMLInputElement)) return;
    const next = toggleCoordinateDraft(input.value);
    setValue(field, next as unknown as number, {
      shouldDirty: true,
      shouldValidate: /^-?\d+(\.\d+)?$/.test(next),
    });
    input.focus();
    const end = input.value.length;
    input.setSelectionRange(end, end);
  };

  const handleAddVolume = () => {
    const current = getValues('volumeFiltered');
    const base = typeof current === 'number' && !isNaN(current) ? current : 0;
    const next = base + 50;
    setValue('volumeFiltered', next, { shouldValidate: true, shouldDirty: true });
  };

  const handleSubtractVolume = () => {
    const current = getValues('volumeFiltered');
    const base = typeof current === 'number' && !isNaN(current) ? current : 0;
    const next = Math.max(0, base - 50); // Ensure it doesn't go below 0
    setValue('volumeFiltered', next, { shouldValidate: true, shouldDirty: true });
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

        <TextField id="sampleId" label="Kit number or sample ID" error={errors.sampleId?.message} required>
          <TextFieldInput
            id="sampleId"
            {...register('sampleId', {
              required: 'Sample ID is required',
            })}
            placeholder="Enter the kit number"
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

        <TextField id="site" label="Site or project" error={errors.site?.message} required>
          <p>If this sampling is part of a eDNA Expeditions sampling campaign or a project, add a standardized name for the site or project. For example "Aldabra Atoll" or "Scaglieri Bioblitz".</p>
          <TextFieldInput
            id="site"
            list="site-suggestions"
            {...register('site', {
              required: 'Site or project is required',
            })}
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

        <TextField id="locality" label="Locality" error={errors.locality?.message} required>
          <p>Add a standardized name for the sampling location, for example "Oyster Point", "Pigeon Reef".</p>
          <TextFieldInput
            id="locality"
            list="locality-suggestions"
            {...register('locality', {
              required: 'Locality is required',
            })}
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
            disabled={!!isControl}
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
        <p>Alternatively, mark this sample as a control sample.</p>
        <label className={styles.toggleRow} htmlFor="control">
          <input
            id="control"
            type="checkbox"
            className={styles.toggleInput}
            {...register('control')}
          />
          <span className={styles.toggleLabel}>
            <span className={styles.toggleTitle}>Control sample</span>
          </span>
        </label>

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
              <div className={styles.coordinateRow}>
                <button
                  type="button"
                  className={styles.signButton}
                  onClick={() => toggleCoordinateSign('latitude')}
                  aria-label="Toggle negative latitude"
                >
                  ±
                </button>
                <TextFieldInput
                  id="latitude"
                  type="text"
                  lang="en"
                  inputMode="text"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  {...register('latitude', {
                    required: 'Latitude is required',
                    min: { value: -90, message: 'Latitude must be between -90 and 90' },
                    max: { value: 90, message: 'Latitude must be between -90 and 90' },
                    validate: (value) =>
                      (typeof value === 'number' && !Number.isNaN(value)) ||
                      'Enter a valid latitude',
                    valueAsNumber: true,
                    onChange: handleCoordinateInput,
                  })}
                  onInput={handleCoordinateInput}
                  placeholder="0.00000"
                />
              </div>
            </TextField>

            <TextField id="longitude" label="Longitude" error={errors.longitude?.message} required>
              <div className={styles.coordinateRow}>
                <button
                  type="button"
                  className={styles.signButton}
                  onClick={() => toggleCoordinateSign('longitude')}
                  aria-label="Toggle negative longitude"
                >
                  ±
                </button>
                <TextFieldInput
                  id="longitude"
                  type="text"
                  lang="en"
                  inputMode="text"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  {...register('longitude', {
                    required: 'Longitude is required',
                    min: { value: -180, message: 'Longitude must be between -180 and 180' },
                    max: { value: 180, message: 'Longitude must be between -180 and 180' },
                    validate: (value) =>
                      (typeof value === 'number' && !Number.isNaN(value)) ||
                      'Enter a valid longitude',
                    valueAsNumber: true,
                    onChange: handleCoordinateInput,
                  })}
                  onInput={handleCoordinateInput}
                  placeholder="0.00000"
                />
              </div>
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
              active={active}
            />
          )}
        </div>

        <TextField id="volumeFiltered" label="Volume filtered (milliliters)" error={errors.volumeFiltered?.message} required>
          <div className={styles.volumeRow}>
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
            <button
              type="button"
              onClick={handleAddVolume}
              className={styles.volumeButton}
            >
              +50&nbsp;ml
            </button>
            <button
              type="button"
              onClick={handleSubtractVolume}
              className={styles.volumeButton}
            >
              -50&nbsp;ml
            </button>
          </div>
        </TextField>

        <TextField id="filteringMethod" label="Filtering method" error={errors.filteringMethod?.message}>
          <select
            id="filteringMethod"
            className={styles.select}
            defaultValue=""
            {...register('filteringMethod', {
              setValueAs: (value) => (value === '' ? undefined : value),
            })}
          >
            <option value="">Not specified</option>
            <option value="syringe">Syringe</option>
            <option value="pump">Pump</option>
          </select>
        </TextField>

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
            type="text"
            lang="en"
            inputMode="decimal"
            step="0.1"
            {...register('waterTemperature', {
              setValueAs: (value) => {
                if (value === '' || value === null || value === undefined) return undefined;
                const normalized = String(value).replace(',', '.');
                const num = Number(normalized);
                return isNaN(num) ? undefined : num;
              },
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
        <p>Add a photo of the completed sampling sheet.</p>
        <ImageCapture
          onImageChange={setSheetImage}
          value={sheetImage}
          inputId="sheet-image-capture"
        />
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Sampling bag</h2>
        <p>Add a photo of the sampling bag form.</p>
        <ImageCapture
          onImageChange={setBagImage}
          value={bagImage}
          inputId="bag-image-capture"
        />
      </div>

      {!sheetImage && !bagImage && (
        <div className={styles.warningMessage} role="status">
          No photos selected. Consider adding a sampling sheet and bag photo before submitting.
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className={styles.submitButton}
      >
        {submitting ? 'Submitting...' : 'Submit sample'}
      </button>
    </form>
  );
}

