"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toAdminDashboardDTO = void 0;
const toAdminDashboardDTO = (totalUsers, totalProviders, totalBookings, dailyBookings, monthlyRevenue, topActiveProviders, providerReviewCounts) => {
    const enrichedProviders = topActiveProviders.map(provider => {
        const reviewData = providerReviewCounts.find(r => r.providerId.toString() === provider._id.toString());
        return Object.assign(Object.assign({}, provider), { reviewCount: reviewData ? reviewData.reviewCount : 0 });
    });
    return {
        totalUsers,
        totalProviders,
        totalBookings,
        dailyBookings,
        monthlyRevenue,
        topActiveProviders: enrichedProviders,
    };
};
exports.toAdminDashboardDTO = toAdminDashboardDTO;
