import { Schema, model, Types, HydratedDocument, InferSchemaType } from 'mongoose';
import { ProviderStatus } from '../enums/provider.enum';
import { SubscriptionStatus } from '../enums/subscription.enum';


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
    serviceId: {
        type: [Types.ObjectId],
        ref: 'Category',
        required: true,
    },
    serviceLocation: {
        type: {
            type: String,
            enum: ['Point'],
            required: true
        },
        coordinates: {
            type: [Number],
            required: true
        }
    },
    serviceArea: {
        type: String,
        required: true,
    },
    availability: {
        type: [
            {
                day: { type: String, required: true },
                startTime: { type: String, required: true },
                endTime: { type: String, required: true },
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
    subscription: {
        planId: { 
            type: Schema.Types.ObjectId, 
            ref: "SubscriptionPlan",
        },
        startDate: Date,
        endDate: Date,
        status: { 
            type: String, 
            enum: Object.values(SubscriptionStatus), 
            default: SubscriptionStatus.NONE
        }
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
