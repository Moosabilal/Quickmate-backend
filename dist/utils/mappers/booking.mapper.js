import {} from "../../interface/booking.js";
import {} from "../../enums/booking.enum.js";
import {} from "../../enums/userRoles.js";
import {} from "../../models/address.js";
import {} from "../../models/Booking.js";
import {} from "../../models/message.js";
import {} from "../../models/payment.js";
import {} from "../../models/Service.js";
import {} from "../../models/Providers.js";
import {} from "../../models/User.js";
import {} from "../../models/Review.js";
import { getSignedUrl } from "../cloudinaryUpload.js";
import {} from "../../interface/message.js";
export function toBookingConfirmationPage(booking, address, categoryIcon, service, payment, provider, review, providerRating, providerReviewsCount) {
    return {
        id: booking._id.toString(),
        serviceName: service.title,
        serviceImage: categoryIcon ? getSignedUrl(categoryIcon) : "",
        providerName: provider.fullName,
        providerImage: provider.profilePhoto ? getSignedUrl(provider.profilePhoto) : "",
        providerRating: providerRating || 0,
        providerReviewsCount: providerReviewsCount || 0,
        priceUnit: service.priceUnit,
        duration: service.duration || "",
        bookedOrderId: payment.razorpay_order_id,
        customer: booking.customerName,
        phone: booking.phone,
        date: booking.scheduledDate,
        time: booking.scheduledTime,
        address: {
            label: address.label,
            street: address.street,
            city: address.city,
            state: address.state,
            zip: address.zip,
        },
        amount: payment.amount,
        status: booking.status,
        paymentStatus: booking.paymentStatus,
        specialInstruction: booking.instructions,
        providerTimings: provider.availability?.weeklySchedule || [],
        createdAt: booking.createdAt,
        reviewed: booking.reviewed || false,
        rating: (review && review.rating) || 0,
        review: (review && review.reviewText) || "",
    };
}
export function toBookingHistoryPage(bookings, addressMap, providerMap, subCategoryMap, serviceMap) {
    return bookings.map((booking) => ({
        id: booking._id.toString(),
        serviceName: serviceMap.get(booking.serviceId.toString())?.title || "",
        serviceImage: subCategoryMap.get(serviceMap.get(booking.serviceId.toString())?.subCategoryId || "")?.iconUrl || "",
        providerName: providerMap.get(booking.providerId.toString())?.fullName || "",
        providerImage: providerMap.get(booking.providerId.toString())?.profilePhoto || "",
        date: booking.scheduledDate,
        time: booking.scheduledTime,
        status: booking.status,
        price: Number(booking.amount || 0),
        location: `${addressMap.get(booking.addressId.toString())?.street || ""}, ${addressMap.get(booking.addressId.toString())?.city || ""}`,
        priceUnit: serviceMap.get(booking.serviceId.toString())?.priceUnit || "",
        duration: serviceMap.get(booking.serviceId.toString())?.duration || "",
        description: booking?.instructions || "",
        createdAt: booking?.createdAt,
    }));
}
export function toProviderBookingManagement(bookings, users, services, addresses, payments) {
    return bookings.map((booking) => {
        const user = users.find((u) => u._id.toString() === booking.userId?.toString());
        const service = services.find((s) => s._id.toString() === booking.serviceId?.toString());
        const address = addresses.find((a) => a._id.toString() === booking.addressId?.toString());
        const payment = payments.find((p) => p._id.toString() === booking.paymentId?.toString());
        return {
            id: booking._id.toString(),
            customerId: user._id.toString(),
            customerName: String(booking.customerName || user?.fullName || ""),
            customerImage: String(user?.profilePicture || ""),
            service: String(service?.title || ""),
            date: String(booking.scheduledDate || ""),
            time: String(booking.scheduledTime || ""),
            duration: service.priceUnit === "PerHour" ? String(service?.duration || "") : service.priceUnit,
            location: address ? `${address.street}, ${address.city}` : "",
            payment: Number(payment?.amount || 0),
            paymentStatus: String(booking.paymentStatus || ""),
            status: booking.status,
            description: String(service?.description || ""),
            customerPhone: String(booking.phone || ""),
            customerEmail: String(user?.email || ""),
            specialRequests: String(booking.instructions || ""),
            createdAt: booking.createdAt ? booking.createdAt.toISOString() : "",
        };
    });
}
export function toGetAllFiltersBookingDto(booking) {
    return {
        ...booking,
        serviceImage: booking.serviceImage ? getSignedUrl(booking.serviceImage) : "",
        providerImage: booking.providerImage ? getSignedUrl(booking.providerImage) : "",
    };
}
export function toGetBookingForProvider(booking) {
    return {
        ...booking,
        customerImage: booking.customerImage ? getSignedUrl(booking.customerImage) : "",
    };
}
export function toBookingMessagesDto(message) {
    const msgObj = message.toObject ? message.toObject() : message;
    return {
        ...msgObj,
        fileUrl: msgObj.fileUrl ? getSignedUrl(msgObj.fileUrl) : "",
    };
}
