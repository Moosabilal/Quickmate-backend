import { IBooking } from "../models/Booking";
import { IPayment } from "../models/payment";
import { IService } from "../models/Service";
import { IProviderProfile } from "./provider";

export interface IKpiData {
    totalBookings: number;
    activeUsers: number;
    revenue: number;
    avgRating: number;
}

export interface IAnalyticsData {
    topServiceCategories: { name: string; value: number }[];
    bookingTrends: { month: string; value: number }[];
    weeklyPattern: { day: string; value: number }[];
    topProviders: { name: string; earnings: number }[];
    kpi: IKpiData;
}

export interface IProviderFullDetails {
    profile: IProviderProfile;
    services: IService[];
    bookings: IBooking[]; 
    payments: IPayment[]; 
    stats: {
        totalEarnings: number;
        totalBookings: number;
        completedBookings: number;
        cancelledBookings: number;
        averageRating: number;
    };
    currentPlan?: {
        _id: string;
        name: string;
        price: number;
    } | null;
}