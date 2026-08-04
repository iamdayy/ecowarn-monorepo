import { Schema, model, Document } from 'mongoose';

export type ReportStatus = 'ACTIVE' | 'IN_PROGRESS' | 'RESOLVED';
export type TrashVolumeStatus = 'Ringan' | 'Sedang' | 'Kritis';
export type AreaType = 'Selokan' | 'Sungai Kecil' | 'Sungai Besar';

export interface IReport extends Document {
  reporterId: Schema.Types.ObjectId;
  location: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  severity: TrashVolumeStatus;
  areaType?: AreaType;
  status: ReportStatus;
  photoUrl?: string;
  resolvedPhotoUrl?: string;
  resolvedBy?: Schema.Types.ObjectId;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const reportSchema = new Schema<IReport>(
  {
    reporterId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Identitas relawan pengirim laporan (reporterId) wajib disematkan'],
      index: true,
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        required: [true, 'Tipe lokasi harus GeoJSON Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        required: [true, 'Koordinat [longitude, latitude] wajib diisi'],
        validate: {
          validator: (coords: number[]) => coords.length === 2,
          message: 'Koordinat harus terdiri dari [longitude, latitude]',
        },
      },
    },
    severity: {
      type: String,
      enum: ['Ringan', 'Sedang', 'Kritis'],
      required: [true, 'Status volume sampah (severity) wajib diisi'],
    },
    areaType: {
      type: String,
      enum: ['Selokan', 'Sungai Kecil', 'Sungai Besar'],
      required: false,
      index: true,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'IN_PROGRESS', 'RESOLVED'],
      default: 'ACTIVE',
      index: true,
    },
    photoUrl: {
      type: String,
      required: false,
    },
    resolvedPhotoUrl: {
      type: String,
      required: false,
    },
    resolvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    resolvedAt: {
      type: Date,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

// Index 2dsphere untuk pencarian radius spasial dan kueri geospasial
reportSchema.index({ location: '2dsphere' });

export const Report = model<IReport>('Report', reportSchema);
