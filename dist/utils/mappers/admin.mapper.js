import {} from "../../interface/provider.js";
export const toAdminDashboardDTO = (totalUsers, totalProviders, totalBookings, dailyBookings, monthlyRevenue, topActiveProviders, providerReviewCounts) => {
    const enrichedProviders = topActiveProviders.map((provider) => {
        const reviewData = providerReviewCounts.find((r) => r.providerId.toString() === provider._id.toString());
        return {
            ...provider,
            reviewCount: reviewData ? reviewData.reviewCount : 0,
        };
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
