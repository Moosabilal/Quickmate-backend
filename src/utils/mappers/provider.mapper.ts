import { IProvider } from '../../models/Providers';
import { IProviderForChatListPage, IProviderProfile, IServiceAddPageResponse } from '../../interface/provider.dto';
import { ICategory } from '../../models/Categories';
import { IBooking } from '../../models/Booking';
import { IService } from '../../models/Service';
import { IDashboardResponse, IDashboardStatus } from "../../interface/provider.dto";
import { BookingStatus } from "../../enums/booking.enum";
import { IReview } from '../../models/Review';


export function toProviderDTO(provider: IProvider): IProviderProfile {
  return {
    id: provider._id.toString(),
    userId: provider.userId.toString(),
    fullName: provider.fullName,
    phoneNumber: provider.phoneNumber,
    email: provider.email,
    serviceId: provider.serviceId.map(id => id.toString()),
    serviceLocation: `${provider.serviceLocation.coordinates[1]},${provider.serviceLocation.coordinates[0]}`,
    serviceArea: provider.serviceArea,
    availability: provider.availability.map(a => ({
      day: a.day,
      startTime: a.startTime,
      endTime: a.endTime,
    })),
    profilePhoto: provider.profilePhoto,
    earnings: provider.earnings,
    status: provider.status,
    totalBookings: provider.totalBookings,
    payoutPending: provider.payoutPending,
    rating: provider.rating,
    isVerified: provider.isVerified,
    subscription: provider.subscription
  };
}

export function toServiceAddPage(category: ICategory): IServiceAddPageResponse {
  return {
    id: category._id.toString(),
    name: category.name,
    parentId: category.parentId ? category.parentId.toString() : null
  }
}

export function toProviderForChatListPage(
  bookings: IBooking[],
  providers: IProvider[],
  services: IService[],
  messages: { bookingId: string; lastMessage: string; createdAt: Date }[]
): IProviderForChatListPage[] {

  return providers.map((provider) => {
    const booking = bookings.find(
      (b) => b.providerId?.toString() === provider._id.toString()
    );
    const providerServices = services.filter(
      (s) => s.providerId?.toString() === provider._id.toString()
    );
    const lastMessageData = messages.find(
      (m) => m.bookingId === booking?._id.toString()
    )

    return {
      id: provider._id.toString(),
      bookingId: booking?._id.toString(),
      name: provider.fullName,
      profilePicture: provider.profilePhoto || "",
      location: provider.serviceArea,
      isOnline: true,
      services: providerServices[0]?.title || "",
      lastMessage: lastMessageData?.lastMessage || "",
      lastMessageAt: lastMessageData?.createdAt || null,
    };
  });
}

function buildRatingHistory(reviews: IReview[]) {
  const monthMap = new Map<string, { total: number; count: number }>();

  reviews.forEach((r) => {
    const createdAt = r.createdAt as string | Date;
    const date = new Date(createdAt);

    const month = date.toLocaleString("default", { month: "short" });
    if (!monthMap.has(month)) {
      monthMap.set(month, { total: 0, count: 0 });
    }
    const entry = monthMap.get(month)!;
    entry.total += Number(r.rating) || 0;
    entry.count += 1;
  });

  return Array.from(monthMap.entries()).map(([month, { total, count }]) => ({
    month,
    rating: count > 0 ? total / count : 0,
  }));
}


export function toProviderDashboardDTO(
  provider: IProvider,
  bookings: IBooking[],
  services: IService[],
  subCategories: ICategory[],
  parentCategories: ICategory[],
  reviews: IReview[]
): { dashboardData: IDashboardResponse[]; dashboardStat: IDashboardStatus } {
  const serviceMap = new Map(services.map((s) => [s._id.toString(), s]));
  const subCategoryMap = new Map(
    subCategories.map((sc) => [sc._id.toString(), sc])
  );
  const parentCategoryMap = new Map(
    parentCategories.map((pc) => [pc._id.toString(), pc])
  );

  const dashboardData: IDashboardResponse[] = bookings.map((booking) => {
    const service = serviceMap.get(booking.serviceId?.toString() || "");
    const subCategory = service
      ? subCategoryMap.get(service.subCategoryId?.toString() || "")
      : undefined;
    const parentCategory = subCategory
      ? parentCategoryMap.get(subCategory.parentId?.toString() || "")
      : undefined;

    return {
      id: booking._id.toString(),
      service: service?.title || "Unknown Service",
      client: `${booking.customerName} • ${booking.scheduledDate} ${booking.scheduledTime}`,
      status: booking.status as BookingStatus,
      image: subCategory?.iconUrl || "",
      category: parentCategory?.name || "Unknown Category",
    };
  });

  const completedJobs = bookings.filter(
    (b) => b.status === BookingStatus.COMPLETED
  ).length;

  const today = new Date();
  const upcomingBookings = bookings.filter((b) => {
    const bookingDate = new Date(b.scheduledDate as string);
    return bookingDate >= today;
  }).length;

  const averageRating =
    reviews.length > 0
      ? reviews.reduce((acc, r) => acc + (Number(r.rating) || 0), 0) /
      reviews.length
      : 0;

  const ratingHistory = buildRatingHistory(reviews);


  const dashboardStat: IDashboardStatus = {
    earnings: provider.earnings,
    completedJobs,
    upcomingBookings,
    averageRating,
    ratingHistory,
  };

  return { dashboardData, dashboardStat };
}


