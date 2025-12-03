"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toBookingConfirmationPage = toBookingConfirmationPage;
exports.toBookingHistoryPage = toBookingHistoryPage;
exports.toProviderBookingManagement = toProviderBookingManagement;
function toBookingConfirmationPage(booking, address, categoryIcon, service, payment, provider, review) {
    var _a;
    return {
        id: booking._id.toString(),
        serviceName: service.title,
        serviceImage: categoryIcon || '',
        providerName: provider.fullName,
        providerImage: provider.profilePhoto || '',
        priceUnit: service.priceUnit,
        duration: service.duration || '',
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
        providerTimings: ((_a = provider.availability) === null || _a === void 0 ? void 0 : _a.weeklySchedule) || [],
        createdAt: booking.createdAt,
        reviewed: booking.reviewed || false,
        rating: (review && review.rating) || 0,
        review: (review && review.reviewText) || ''
    };
}
function toBookingHistoryPage(bookings, addressMap, providerMap, subCategoryMap, serviceMap) {
    return bookings.map((booking) => {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j;
        return ({
            id: booking._id.toString(),
            serviceName: ((_a = serviceMap.get(booking.serviceId.toString())) === null || _a === void 0 ? void 0 : _a.title) || '',
            serviceImage: ((_c = subCategoryMap.get(((_b = serviceMap.get(booking.serviceId.toString())) === null || _b === void 0 ? void 0 : _b.subCategoryId) || '')) === null || _c === void 0 ? void 0 : _c.iconUrl) || '',
            providerName: ((_d = providerMap.get(booking.providerId.toString())) === null || _d === void 0 ? void 0 : _d.fullName) || '',
            providerImage: ((_e = providerMap.get(booking.providerId.toString())) === null || _e === void 0 ? void 0 : _e.profilePhoto) || '',
            date: booking.scheduledDate,
            time: booking.scheduledTime,
            status: booking.status,
            price: Number(booking.amount || 0),
            location: `${((_f = addressMap.get(booking.addressId.toString())) === null || _f === void 0 ? void 0 : _f.street) || ''}, ${((_g = addressMap.get(booking.addressId.toString())) === null || _g === void 0 ? void 0 : _g.city) || ''}`,
            priceUnit: ((_h = serviceMap.get(booking.serviceId.toString())) === null || _h === void 0 ? void 0 : _h.priceUnit) || '',
            duration: ((_j = serviceMap.get(booking.serviceId.toString())) === null || _j === void 0 ? void 0 : _j.duration) || '',
            description: (booking === null || booking === void 0 ? void 0 : booking.instructions) || '',
            createdAt: booking === null || booking === void 0 ? void 0 : booking.createdAt,
        });
    });
}
function toProviderBookingManagement(bookings, users, services, addresses, payments) {
    return bookings.map((booking) => {
        const user = users.find(u => { var _a; return u._id.toString() === ((_a = booking.userId) === null || _a === void 0 ? void 0 : _a.toString()); });
        const service = services.find(s => { var _a; return s._id.toString() === ((_a = booking.serviceId) === null || _a === void 0 ? void 0 : _a.toString()); });
        const address = addresses.find(a => { var _a; return a._id.toString() === ((_a = booking.addressId) === null || _a === void 0 ? void 0 : _a.toString()); });
        const payment = payments.find(p => { var _a; return p._id.toString() === ((_a = booking.paymentId) === null || _a === void 0 ? void 0 : _a.toString()); });
        return {
            id: booking._id.toString(),
            customerId: user._id.toString(),
            customerName: String(booking.customerName || (user === null || user === void 0 ? void 0 : user.fullName) || ''),
            customerImage: String((user === null || user === void 0 ? void 0 : user.profilePicture) || ''),
            service: String((service === null || service === void 0 ? void 0 : service.title) || ''),
            date: String(booking.scheduledDate || ''),
            time: String(booking.scheduledTime || ''),
            duration: service.priceUnit === "PerHour" ? String((service === null || service === void 0 ? void 0 : service.duration) || '') : service.priceUnit,
            location: address ? `${address.street}, ${address.city}` : '',
            payment: Number((payment === null || payment === void 0 ? void 0 : payment.amount) || 0),
            paymentStatus: String(booking.paymentStatus || ''),
            status: booking.status,
            description: String((service === null || service === void 0 ? void 0 : service.description) || ''),
            customerPhone: String(booking.phone || ''),
            customerEmail: String((user === null || user === void 0 ? void 0 : user.email) || ''),
            specialRequests: String(booking.instructions || ''),
            createdAt: booking.createdAt
                ? booking.createdAt.toISOString()
                : '',
        };
    });
}
