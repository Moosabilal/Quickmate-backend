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