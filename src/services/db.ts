import Dexie, { Table } from 'dexie';
import { Sample } from '../types/sample';

export class SampleDatabase extends Dexie {
  samples!: Table<Sample, string>;

  constructor() {
    super('ednaMetadataDB');
    
    this.version(1).stores({
      samples: 'id, sampleId, createdAt'
      // Note: 'synced' is not indexed as IndexedDB doesn't handle boolean indexes well
    });
  }
}

export const db = new SampleDatabase();

