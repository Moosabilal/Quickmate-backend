import mongoose, { Schema, Document, HydratedDocument, InferSchemaType } from 'mongoose';
import bcrypt from 'bcrypt';
import { Roles } from '../enums/userRoles';

const UserSchema: Schema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: false, select: false }, 
  role: { type: String, enum: Object.values(Roles), default: Roles.USER },
  isVerified: { type: Boolean, default: false },
  profilePicture: { type: String, default: null }, 
  registrationOtp: { type: String, select: false },
  registrationOtpExpires: { type: Date, select: false },
  registrationOtpAttempts: { type: Number, default: 0, select: false },
  refreshToken:{ type: String, select: false},
  passwordResetToken: { type: String, select: false },
  passwordResetExpires: { type: Date, select: false },
  googleId: { type: String, unique: true, sparse: true },
  provider: { type: String, enum: ['local', 'google'], default: 'local' },
}, { timestamps: true });

UserSchema.pre('save', async function (next) {
  if (this.isModified('password') && this.password) {
    this.password = await bcrypt.hash(this.password as string, 10); 
  }
  next(); 
});

type UserSchemaType = InferSchemaType<typeof UserSchema>;
export type IUser = HydratedDocument<UserSchemaType>

export default mongoose.model<IUser>('User', UserSchema);