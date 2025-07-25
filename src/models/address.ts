import { Schema, model, Types, HydratedDocument, InferSchemaType } from 'mongoose';

// Define the schema
const AddressSchema = new Schema({
  userId: {
    type: Types.ObjectId,
    ref: 'User',
    required: true,
  },
  label: {
    type: String,
    required: true,
    trim: true,
  },
  street: {
    type: String,
    required: true,
    trim: true,
  },
  city: {
    type: String,
    required: true,
    trim: true,
  },
  state: {
    type: String,
    required: true,
    trim: true,
  },
  zip: {
    type: String,
    required: true,
    trim: true,
  },
}, {
  timestamps: true,
});

type AddressSchemaType = InferSchemaType<typeof AddressSchema>;

export interface IAddress extends HydratedDocument<AddressSchemaType> {}

export const Address = model<IAddress>('Address', AddressSchema);
