import { Schema, model, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export type UserRole = 'Relawan' | 'Warga';

export interface IUser extends Document {
  name: string;
  email: string;
  phoneNumber: string;
  password: string;
  role: UserRole;
  fcmToken?: string;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, 'Nama lengkap wajib diisi'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Alamat email wajib diisi'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Format email tidak valid'],
    },
    phoneNumber: {
      type: String,
      required: [true, 'Nomor Handphone wajib diisi'],
      unique: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Kata sandi wajib diisi'],
      minlength: [6, 'Kata sandi minimal 6 karakter'],
      select: true,
    },
    role: {
      type: String,
      enum: ['Relawan', 'Warga'],
      required: [true, 'Peran pengguna (role) wajib dipilih antara Relawan atau Warga'],
      default: 'Warga',
    },
    fcmToken: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save hook untuk melakukan enkripsi (hashing) kata sandi sebelum disimpan ke database
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[Error UserSchema Pre-Save] Gagal melakukan hashing kata sandi: ${errorMessage}`);
    next(error as Error);
  }
});

// Metode instansiasi untuk memverifikasi kecocokan kata sandi saat autentikasi login
userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[Error UserSchema ComparePassword] Gagal memverifikasi kata sandi: ${errorMessage}`);
    return false;
  }
};

export const User = model<IUser>('User', userSchema);
