"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Provider = void 0;
const mongoose_1 = require("mongoose");
const provider_enum_1 = require("../enums/provider.enum");
const subscription_enum_1 = require("../enums/subscription.enum");
const TimeSlotSchema = new mongoose_1.Schema({
    start: { type: String, required: true },
    end: { type: String, required: true }
}, { _id: false });
const DayScheduleSchema = new mongoose_1.Schema({
    day: { type: String, required: true },
    active: { type: Boolean, required: true },
    slots: [TimeSlotSchema]
}, { _id: false });
const DateOverrideSchema = new mongoose_1.Schema({
    date: { type: String, required: true },
    isUnavailable: { type: Boolean, required: true },
    busySlots: [TimeSlotSchema],
    reason: { type: String }
}, { _id: false });
const LeavePeriodSchema = new mongoose_1.Schema({
    from: { type: String, required: true },
    to: { type: String, required: true },
    reason: { type: String }
}, { _id: false });
const ProviderSchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Types.ObjectId,
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
        enum: Object.values(provider_enum_1.ProviderStatus),
        default: provider_enum_1.ProviderStatus.PENDING,
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
            type: mongoose_1.Schema.Types.ObjectId,
            ref: "SubscriptionPlan",
        },
        startDate: Date,
        endDate: Date,
        status: {
            type: String,
            enum: Object.values(subscription_enum_1.SubscriptionStatus),
            default: subscription_enum_1.SubscriptionStatus.NONE
        },
        pendingDowngradePlanId: {
            type: mongoose_1.Schema.Types.ObjectId,
            ref: "SubscriptionPlan",
            default: null
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
exports.Provider = (0, mongoose_1.model)('Provider', ProviderSchema);
