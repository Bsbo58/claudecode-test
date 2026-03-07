// Shared types and in-memory session store

export type CellValue = string | number | boolean | Date | null;

export interface Row {
  [column: string]: CellValue;
}

export interface Dataset {
  id: string;
  name: string;       // original filename
  sheet: string;      // sheet name
  rows: Row[];
  loadedAt: Date;
}

// Global in-memory store: datasetId → Dataset
export const datasets = new Map<string, Dataset>();

let counter = 0;

export function newDatasetId(): string {
  counter += 1;
  return `ds_${Date.now()}_${counter}`;
}
