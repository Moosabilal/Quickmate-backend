import { IProviderDashboardRes, ITopActiveProviders } from "../../interface/provider";
import { BookingService } from "../../services/implementation/bookingService";

export const toAdminDashboardDTO = (
  totalUsers: number,
  totalProviders: number,
  totalBookings: number,
  dailyBookings: { date: string; total: number }[],
  monthlyRevenue: { month: string; total: number }[],
  topActiveProviders: ITopActiveProviders[],
  providerReviewCounts: { providerId: string; reviewCount: number }[]
): IProviderDashboardRes => {
  const enrichedProviders = topActiveProviders.map(provider => {
    const reviewData = providerReviewCounts.find(
      r => r.providerId.toString() === provider._id.toString()
    );
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
