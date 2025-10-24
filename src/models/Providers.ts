import { Schema, model, Types, HydratedDocument, InferSchemaType } from 'mongoose';
import { ProviderStatus } from '../enums/provider.enum';
import { SubscriptionStatus } from '../enums/subscription.enum';

const TimeSlotSchema = new Schema({
    start: { type: String, required: true },
    end: { type: String, required: true }
}, { _id: false });

const DayScheduleSchema = new Schema({
    day: { type: String, required: true },
    active: { type: Boolean, required: true },
    slots: [TimeSlotSchema]
}, { _id: false });

const DateOverrideSchema = new Schema({
    date: { type: String, required: true },
    isUnavailable: { type: Boolean, required: true },
    busySlots: [TimeSlotSchema],
    reason: { type: String }
}, { _id: false });

const LeavePeriodSchema = new Schema({
    from: { type: String, required: true },
    to: { type: String, required: true },  
    reason: { type: String }
}, { _id: false });

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
        weeklySchedule: {
            type: [DayScheduleSchema],
            default: [
                { day: 'Sunday', active: false, slots: [] },
                { day: 'Monday', active: true, slots: [{ start: '09:00', end: '17:00' }] },
                { day: 'Tuesday', active: true, slots: [{ start: '09:00', end: '17:00' }] },
                { day: 'Wednesday', active: true, slots: [{ start: '09:00', end: '17:00' }] },
                { day: 'Thursday', active: true, slots: [{ start: '09:00', end: '17:00' }] },
                { day: 'Friday', active: true, slots: [{ start: '09:00', end: '17:00' }] },
                { day: 'Saturday', active: false, slots: [] },
            ]
        },
        dateOverrides: {
            type: [DateOverrideSchema],
            default: []
        },
        leavePeriods: {
            type: [LeavePeriodSchema],
            default: []
        }
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

ProviderSchema.index({ serviceLocation: "2dsphere" });

type ProviderSchemaType = InferSchemaType<typeof ProviderSchema>;
export interface IProvider extends HydratedDocument<ProviderSchemaType> { }

export const Provider = model<IProvider>('Provider', ProviderSchema);
