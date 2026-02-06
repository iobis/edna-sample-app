export interface Sample {
  id: string; // UUID, internal database ID for tracking
  sampleId: string; // Official sample ID from printed kit label
  contactName: string;
  contactEmail: string;
  dateTime: Date;
  volumeFiltered?: number; // milliliters
  waterTemperature?: number; // Celsius
  remarks?: string;
  environmentRemarks?: string;
  replicate?: number;
  site?: string;
  locality?: string;
  longitude: number;
  latitude: number;
  coordinateUncertainty: number; // meters
  imageId?: string; // Optional reference to associated image
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
  environmentRemarks?: string;
  replicate?: number;
  site?: string;
  locality?: string;
  longitude: number;
  latitude: number;
  coordinateUncertainty: number;
  imageFile?: File; // Optional image file for upload
}

export interface SampleImage {
  id: string; // UUID
  sampleId: string; // Links to Sample.sampleId (official ID)
  blob: Blob;
  filename: string;
  mimeType: string;
  size: number; // bytes
  synced: boolean;
  createdAt: Date;
  updatedAt: Date;
}

