import {} from "../../models/Providers.js";
import {} from "../../interface/provider.js";
import {} from "../../models/Categories.js";
import {} from "../../models/Booking.js";
import {} from "../../models/Service.js";
import {} from "../../interface/provider.js";
import { BookingStatus } from "../../enums/booking.enum.js";
import {} from "../../models/Review.js";
import {} from "../../models/User.js";
import { _haversineKm } from "../helperFunctions/haversineKm.js";
import {} from "../../interface/message.js";
import {} from "../../interface/booking.js";
import { getSignedUrl } from "../cloudinaryUpload.js";
const createJoiningId = (id1, id2) => {
    if (!id1 || !id2)
        return "";
    return [id1, id2].sort().join("-");
};
export function toProviderDTO(provider) {
    return {
        id: provider._id.toString(),
        userId: provider.userId.toString(),
        fullName: provider.fullName,
        phoneNumber: provider.phoneNumber,
        email: provider.email,
        serviceLocation: `${provider.serviceLocation.coordinates[1]},${provider.serviceLocation.coordinates[0]}`,
        serviceArea: provider.serviceArea,
        availability: provider.availability,
        profilePhoto: provider.profilePhoto ? getSignedUrl(provider.profilePhoto) : "",
        earnings: provider.earnings,
        status: provider.status,
        totalBookings: provider.totalBookings,
        payoutPending: provider.payoutPending,
        rating: provider.rating,
        isVerified: provider.isVerified,
        subscription: provider.subscription,
        aadhaarIdProof: provider.aadhaarIdProof ? getSignedUrl(provider.aadhaarIdProof) : "",
        createdAt: provider.createdAt,
    };
}
export function toProviderForAdminResponseDTO(providers, serviceMap) {
    return providers.map((provider) => {
        const providerIdStr = provider._id.toString();
        return {
            id: providerIdStr,
            userId: provider.userId.toString(),
            fullName: provider.fullName,
            phoneNumber: provider.phoneNumber,
            email: provider.email,
            serviceArea: provider.serviceArea,
            profilePhoto: provider.profilePhoto ? getSignedUrl(provider.profilePhoto) : "",
            status: provider.status,
            rating: provider.rating,
            serviceOffered: serviceMap.get(providerIdStr) || [],
        };
    });
}
export function toServiceAddPage(category) {
    return {
        id: category._id.toString(),
        name: category.name,
        parentId: category.parentId ? category.parentId.toString() : null,
    };
}
export function toBackendProviderDTO(provider, services, reviews, subCategoryId, userLat, userLng) {
    const providerServices = services.filter((s) => s.providerId.toString() === provider._id.toString());
    const primaryService = providerServices.find((s) => s.subCategoryId.toString() === subCategoryId) || providerServices[0];
    const [provLng, provLat] = provider.serviceLocation.coordinates;
    const distanceKm = _haversineKm(userLat, userLng, provLat, provLng);
    return {
        _id: provider._id.toString(),
        fullName: provider.fullName,
        phoneNumber: provider.phoneNumber,
        email: provider.email,
        profilePhoto: provider.profilePhoto ? getSignedUrl(provider.profilePhoto) : "",
        serviceArea: provider.serviceArea,
        serviceLocation: `${provLat},${provLng}`,
        availability: provider.availability,
        status: provider.status,
        earnings: provider.earnings,
        totalBookings: provider.totalBookings,
        experience: primaryService?.experience || 0,
        price: primaryService?.price || 0,
        distanceKm: parseFloat(distanceKm.toFixed(2)),
        reviews: reviews,
    };
}
export function toProviderForChatListPage(currentUserId, bookings, providers, services, messages) {
    const messageMap = new Map(messages.map((m) => [m.joiningId, m]));
    return providers.map((provider) => {
        const booking = bookings.find((b) => b.providerId?.toString() === provider._id.toString());
        const providerServices = services.filter((s) => s.providerId?.toString() === provider._id.toString());
        const joiningId = createJoiningId(currentUserId, provider.userId.toString());
        const lastMessageData = messageMap.get(joiningId);
        return {
            id: provider.userId.toString(),
            bookingId: booking?._id.toString(),
            name: provider.fullName,
            profilePicture: provider.profilePhoto ? getSignedUrl(provider.profilePhoto) : "",
            location: provider.serviceArea,
            isOnline: true,
            services: providerServices[0]?.title || "",
            lastMessage: lastMessageData?.lastMessage || null,
            messageType: lastMessageData?.messageType || "text",
            lastMessageSenderId: lastMessageData?.senderId || null,
            lastMessageAt: lastMessageData?.createdAt || null,
        };
    });
}
export function toClientForChatListPage(currentUserId, bookings, clients, services, messages) {
    const messageMap = new Map(messages.map((m) => [m.joiningId, m]));
    return clients
        .map((client) => {
        const clientBooking = bookings
            .filter((b) => b.userId?.toString() === client._id.toString())
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
        if (!clientBooking)
            return null;
        const service = services.find((s) => s._id.toString() === clientBooking.serviceId?.toString());
        const joiningId = createJoiningId(currentUserId, client._id.toString());
        const lastMessageData = messageMap.get(joiningId);
        return {
            id: client._id.toString(),
            bookingId: clientBooking._id.toString(),
            name: client.name,
            profilePicture: client.profilePicture && client.profilePicture === "string" ? getSignedUrl(client.profilePicture) : "",
            location: "",
            isOnline: true,
            services: service?.title || "",
            lastMessage: lastMessageData?.lastMessage || null,
            messageType: lastMessageData?.messageType || "text",
            lastMessageSenderId: lastMessageData?.senderId || null,
            lastMessageAt: lastMessageData?.createdAt || null,
        };
    })
        .filter((item) => item !== null);
}
function buildRatingHistory(reviews) {
    const monthMap = new Map();
    reviews.forEach((r) => {
        const createdAt = r.createdAt;
        const date = new Date(createdAt);
        const month = date.toLocaleString("default", { month: "short" });
        if (!monthMap.has(month)) {
            monthMap.set(month, { total: 0, count: 0 });
        }
        const entry = monthMap.get(month);
        entry.total += Number(r.rating) || 0;
        entry.count += 1;
    });
    return Array.from(monthMap.entries()).map(([month, { total, count }]) => ({
        month,
        rating: count > 0 ? total / count : 0,
    }));
}
export function toEarningsAnalyticsDTO(totalEarnings, earningsChangePercentage, totalClients, newClients, topService, currentBookings) {
    const breakdown = currentBookings.map((b) => ({
        date: new Date(b.updatedAt),
        service: b.serviceId?.title || "Unknown Service",
        client: b.userId?.name || "Unknown Client",
        amount: Number(b.amount) || 0,
        status: String(b.status || "Unknown"),
    }));
    return {
        totalEarnings,
        earningsChangePercentage,
        totalClients,
        newClients,
        topService,
        breakdown,
    };
}
export function toProviderDashboardDTO(provider, bookings, services, subCategories, parentCategories, reviews) {
    const serviceMap = new Map(services.map((s) => [s._id.toString(), s]));
    const subCategoryMap = new Map(subCategories.map((sc) => [sc._id.toString(), sc]));
    const parentCategoryMap = new Map(parentCategories.map((pc) => [pc._id.toString(), pc]));
    const dashboardData = bookings.map((booking) => {
        const service = serviceMap.get(booking.serviceId?.toString() || "");
        const subCategory = service ? subCategoryMap.get(service.subCategoryId?.toString() || "") : undefined;
        const parentCategory = subCategory ? parentCategoryMap.get(subCategory.parentId?.toString() || "") : undefined;
        return {
            id: booking._id.toString(),
            service: service?.title || "Unknown Service",
            client: `${booking.customerName} • ${booking.scheduledDate} ${booking.scheduledTime}`,
            status: booking.status,
            image: subCategory?.iconUrl ? getSignedUrl(subCategory.iconUrl) : "",
            category: parentCategory?.name || "Unknown Category",
        };
    });
    const completedJobs = bookings.filter((b) => b.status === BookingStatus.COMPLETED).length;
    const today = new Date();
    const upcomingBookings = bookings.filter((b) => {
        const bookingDate = new Date(b.scheduledDate);
        return bookingDate >= today;
    }).length;
    const averageRating = reviews.length > 0 ? reviews.reduce((acc, r) => acc + (Number(r.rating) || 0), 0) / reviews.length : 0;
    const ratingHistory = buildRatingHistory(reviews);
    const dashboardStat = {
        earnings: provider.earnings,
        completedJobs,
        upcomingBookings,
        averageRating,
        ratingHistory,
    };
    return { dashboardData, dashboardStat };
}
export function toProviderPerformanceDTO(provider, bookings, reviewsFromDb, users, activeServicesCount, serviceBreakdown) {
    const totalBookings = bookings.length;
    const completedBookings = bookings.filter((b) => b.status === BookingStatus.COMPLETED).length;
    const cancelledBookings = bookings.filter((b) => b.status === BookingStatus.CANCELLED).length;
    const totalEarnings = bookings
        .filter((b) => b.status === BookingStatus.COMPLETED)
        .reduce((sum, b) => sum + (Number(b.amount) || 0), 0);
    const avgRating = reviewsFromDb.length
        ? reviewsFromDb.reduce((sum, r) => sum + (Number(r.rating) || 0), 0) / reviewsFromDb.length
        : 0;
    const reviews = reviewsFromDb.map((r) => {
        const user = users.find((u) => u._id.toString() === r.userId?.toString());
        return {
            name: user?.name || "Anonymous",
            time: r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "N/A",
            rating: Number(r.rating) || 0,
            comment: r.reviewText || "",
            avatar: user?.profilePicture,
        };
    });
    const ratingCounts = new Map([
        [5, 0],
        [4, 0],
        [3, 0],
        [2, 0],
        [1, 0],
    ]);
    reviewsFromDb.forEach((review) => {
        const rating = Math.round(Number(review.rating));
        if (ratingCounts.has(rating)) {
            ratingCounts.set(rating, ratingCounts.get(rating) + 1);
        }
    });
    const totalReviews = reviewsFromDb.length;
    const ratingDistribution = Array.from(ratingCounts.entries())
        .map(([stars, count]) => ({
        stars,
        count,
        percentage: totalReviews > 0 ? parseFloat(((count / totalReviews) * 100).toFixed(1)) : 0,
    }))
        .sort((a, b) => b.stars - a.stars);
    const monthlyRatingData = {};
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    reviewsFromDb.forEach((review) => {
        const reviewDate = new Date(review.createdAt);
        if (reviewDate >= sixMonthsAgo) {
            const monthKey = `${reviewDate.getFullYear()}-${reviewDate.getMonth()}`;
            if (!monthlyRatingData[monthKey])
                monthlyRatingData[monthKey] = { sum: 0, count: 0 };
            monthlyRatingData[monthKey].sum += Number(review.rating);
            monthlyRatingData[monthKey].count++;
        }
    });
    const starRatingTrend = [];
    const monthFormatter = new Intl.DateTimeFormat("en-US", { month: "short" });
    for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
        const monthName = monthFormatter.format(date);
        const data = monthlyRatingData[monthKey];
        starRatingTrend.push({
            month: monthName,
            value: data && data.count > 0 ? parseFloat((data.sum / data.count).toFixed(1)) : 0,
        });
    }
    const completionRate = totalBookings > 0 ? ((completedBookings / totalBookings) * 100).toFixed(1) : "0";
    const cancellationRate = totalBookings > 0 ? ((cancelledBookings / totalBookings) * 100).toFixed(1) : "0";
    return {
        providerId: provider._id.toString(),
        providerName: provider.fullName,
        totalBookings,
        completedBookings,
        cancelledBookings,
        totalEarnings,
        avgRating: parseFloat(avgRating.toFixed(1)),
        activeServices: activeServicesCount ?? 0,
        completionRate: `${completionRate}%`,
        cancellationRate: `${cancellationRate}%`,
        reviews,
        ratingDistribution,
        starRatingTrend,
        serviceBreakdown,
    };
}
export function toServiceDetailsDTO(service) {
    const serviceObj = service;
    return {
        _id: serviceObj._id.toString(),
        title: serviceObj.title,
        description: serviceObj.description,
        price: serviceObj.price,
        priceUnit: serviceObj.priceUnit,
        duration: serviceObj.duration,
        subCategoryId: {
            _id: serviceObj.subCategoryId._id.toString(),
            name: serviceObj.subCategoryId.name || "",
        },
        experience: serviceObj.experience,
    };
}
