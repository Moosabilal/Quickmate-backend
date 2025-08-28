import { Schema, model, Types, HydratedDocument, InferSchemaType } from 'mongoose';
import { ProviderStatus } from '../enums/provider.enum';


const ProviderSchema = new Schema({
    userId: {
        type: Types.ObjectId,
        ref: 'User',
        required: true,
    },
    fullName: {
        type: String,
        required: true,
        trim: true,
    },
    phoneNumber: {
        type: String,
        required: true,
        trim: true,
    },
    email: {
        type: String,
        required: true,
        trim: true,
    },
    // categoryId: {
    //     type: Types.ObjectId,
    //     ref: 'Category',
    //     required: true,
    // },
    serviceId: {
        type: [Types.ObjectId],
        ref: 'Category',
        required: true,
    },
    // serviceName: {
    //     type: String,
    //     required: false,
    //     trim: true,
    // },
    serviceLocation: {
        type: {
            type: String,
            enum: ['Point'],
            required: true
        },
        coordinates: {
            type: [Number], // [longitude, latitude]
            required: true
        }
    },
    // serviceLocation: {
    //     type: String,
    //     required: true,
    // },
    serviceArea: {
        type: String,
        required: true,
    },
    // experience: {
    //     type: Number,
    //     min: 0,
    //     required: true,
    // },
    // price: {
    //     type: Number,
    //     required: false,
    // },
    availability: {
        type: [
            {
                day: { type: String, required: true }, // e.g., "Monday"
                startTime: { type: String, required: true }, // e.g., "09:00"
                endTime: { type: String, required: true },   // e.g., "17:00"
            }
        ],
        required: true,
        default: []
    },

    aadhaarIdProof: {
        type: String,
        required: true
    },

    profilePhoto: {
        type: String,
        required: false,
    },
    earnings: {
        type: Number,
        default: 0,
    },
    status: {
        type: String,
        enum: Object.values(ProviderStatus),
        default: ProviderStatus.PENDING,
    },
    totalBookings: {
        type: Number,
        default: 0,
    },
    payoutPending: {
        type: Number,
        default: 0,
    },
    rating: {
        type: Number,
        default: 0,
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    registrationOtp: {
        type: String,
        select: false
    },
    registrationOtpExpires: {
        type: Date,
        select: false
    },
    registrationOtpAttempts: {
        type: Number,
        default: 0,
        select: false
    },
}, {
    timestamps: true,
});

type ProviderSchemaType = InferSchemaType<typeof ProviderSchema>;
export interface IProvider extends HydratedDocument<ProviderSchemaType> { }

export const Provider = model<IProvider>('Provider', ProviderSchema);
