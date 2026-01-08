import { Schema, model, type HydratedDocument, type InferSchemaType } from "mongoose";

const AddressSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
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
    locationCoords: {
      type: {
        type: String,
        enum: ["Point"],
        required: true,
      },
      coordinates: {
        type: [Number],
        required: true,
      },
    },
  },
  {
    timestamps: true,
  },
);

type AddressSchemaType = InferSchemaType<typeof AddressSchema>;

export type IAddress = HydratedDocument<AddressSchemaType>;

export const Address = model<IAddress>("Address", AddressSchema);
