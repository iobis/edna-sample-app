import Dexie, { Table } from 'dexie';
import { Sample, SampleImage } from '../types/sample';

export class SampleDatabase extends Dexie {
  samples!: Table<Sample, string>;
  images!: Table<SampleImage, string>;

  constructor() {
    super('ednaMetadataDB');
    
    this.version(1).stores({
      samples: 'id, sampleId, createdAt'
      // Note: 'synced' is not indexed as IndexedDB doesn't handle boolean indexes well
    });

    this.version(2).stores({
      samples: 'id, sampleId, createdAt',
      images: 'id, sampleId, createdAt'
      // Note: 'synced' is not indexed as IndexedDB doesn't handle boolean indexes well
    });
  }
}

export const db = new SampleDatabase();

