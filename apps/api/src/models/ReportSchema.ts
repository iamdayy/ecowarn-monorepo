import { Schema, model, Document } from 'mongoose';

export type TrashVolumeStatus = 'Ringan' | 'Sedang' | 'Kritis';

export interface IReport extends Document {
  reporterId: Schema.Types.ObjectId;
  location: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  severity: TrashVolumeStatus;
  photoUrl?: string;
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
    photoUrl: {
      type: String,
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
