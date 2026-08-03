export type ReportStatus = 'ACTIVE' | 'IN_PROGRESS' | 'RESOLVED';
export type TrashVolumeStatus = 'Ringan' | 'Sedang' | 'Kritis';

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TrashDetectionResult {
  boundingBox: BoundingBox;
  ratio: number;
  severity: TrashVolumeStatus;
  timestamp: number;
}

export interface SpatialCoordinates {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  timestamp?: number;
}

export interface ReportPayload {
  latitude: number;
  longitude: number;
  severity: TrashVolumeStatus;
  photoUrl?: string;
}
