import { useState, useEffect, useCallback } from 'react';
import { db } from '../services/db';
import { Sample, SampleFormData } from '../types/sample';
import { v4 as uuidv4 } from 'uuid';

export function useSamples() {
  const [samples, setSamples] = useState<Sample[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSamples = useCallback(async () => {
    try {
      const allSamples = await db.samples.orderBy('createdAt').reverse().toArray();
      setSamples(allSamples);
    } catch (error) {
      console.error('Error loading samples:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSamples();
  }, [loadSamples]);

  const createSample = useCallback(async (formData: SampleFormData, submissionKey: string): Promise<Sample> => {
    const now = new Date();
    const sample: Sample = {
      id: uuidv4(),
      ...formData,
      submissionKey,
      dateTime: new Date(formData.dateTime),
      synced: false,
      createdAt: now,
      updatedAt: now,
    };

    await db.samples.add(sample);
    await loadSamples();
    return sample;
  }, [loadSamples]);

  const deleteSample = useCallback(async (id: string) => {
    await db.samples.delete(id);
    await loadSamples();
  }, [loadSamples]);

  const getSample = useCallback(async (id: string): Promise<Sample | undefined> => {
    return await db.samples.get(id);
  }, []);

  return {
    samples,
    loading,
    createSample,
    deleteSample,
    getSample,
    refresh: loadSamples,
  };
}

