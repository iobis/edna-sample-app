export interface Sample {
  id: string; // UUID, internal database ID for tracking
  sampleId: string; // Official sample ID from printed kit label
  contactName: string;
  contactEmail: string;
  dateTime: Date;
  volumeFiltered?: number; // milliliters
  waterTemperature?: number; // Celsius
  remarks?: string;
  locality?: string;
  longitude: number;
  latitude: number;
  coordinateUncertainty: number; // meters
  synced: boolean; // track sync status
  createdAt: Date;
  updatedAt: Date;
}

export interface SampleFormData {
  sampleId: string;
  contactName: string;
  contactEmail: string;
  dateTime: string; // ISO string for form handling
  volumeFiltered?: number;
  waterTemperature?: number;
  remarks?: string;
  locality?: string;
  longitude: number;
  latitude: number;
  coordinateUncertainty: number;
}

