import { timeStamp } from "console";
import { IBookingConfirmationRes, IBookingHistoryPage, IGetMessages, IProviderBookingManagement } from "../dto/booking.dto";
import { BookingStatus } from "../enums/booking.enum";
import { PaymentStatus } from "../enums/userRoles";
import { IAddress } from "../models/address";
import { IBooking } from "../models/Booking";
import { ICategory } from "../models/Categories";
import message, { IMessage } from "../models/message";
import { IPayment } from "../models/payment";
import { IService } from "../models/Service";

export function toBookingConfirmationPage(booking: IBooking, address: IAddress, category: ICategory, payment: IPayment): IBookingConfirmationRes {
    return {
        id: booking._id.toString(),
        serviceName: category.name,
        bookedOrderId: payment.razorpay_order_id,
        customer: booking.customerName as string,
        phone: booking.phone as string,
        date: booking.scheduledDate as string,
        time: booking.scheduledTime as string,
        address: {
            label: address.label,
            street: address.street,
            city: address.city,
            state: address.state,
            zip: address.zip,
        },
        amount: payment.amount,
        status: booking.status as BookingStatus,
        paymentStatus: booking.paymentStatus as PaymentStatus,
        specialInstruction: booking.instructions as string
    }
}

export function toBookingHistoryPage(
    bookings: IBooking[],
    addressMap: Map<string, { street: string, city: string }>,
    providerMap: Map<string, { fullName: string, profilePhoto: string }>,
    subCategoryMap: Map<string, { iconUrl: string }>,
    serviceMap: Map<string, { title: string, priceUnit: string, duration: string, price: number, subCategoryId: string }>
): IBookingHistoryPage[] {
    return bookings.map((booking) => ({
        id: booking._id.toString(),
        serviceName: serviceMap.get(booking.serviceId.toString())?.title || '',
        serviceImage: subCategoryMap.get(serviceMap.get(booking.serviceId.toString())?.subCategoryId || '')?.iconUrl || '',
        providerName: providerMap.get(booking.providerId.toString())?.fullName || '',
        providerImage: providerMap.get(booking.providerId.toString())?.profilePhoto || '',
        date: booking.scheduledDate as string,
        time: booking.scheduledTime as string,
        status: booking.status as BookingStatus,
        price: serviceMap.get(booking.serviceId.toString())?.price || 0,
        location: `${addressMap.get(booking.addressId.toString())?.street || ''}, ${addressMap.get(booking.addressId.toString())?.city || ''}`,
        priceUnit: serviceMap.get(booking.serviceId.toString())?.priceUnit || '',
        duration: serviceMap.get(booking.serviceId.toString())?.duration || '',
        description: booking?.instructions as string || '',
        createdAt: booking?.createdAt as Date,
    }));
}

export function toProviderBookingManagement(
    bookings: IBooking[],
    users: any[], 
    services: IService[],
    addresses: IAddress[],
    payments: IPayment[]
): IProviderBookingManagement[] {

    return bookings.map((booking): IProviderBookingManagement => {
        const user = users.find(u => u._id.toString() === booking.userId?.toString());
        const service = services.find(s => s._id.toString() === booking.serviceId?.toString());
        const address = addresses.find(a => a._id.toString() === booking.addressId?.toString());
        const payment = payments.find(p => p._id.toString() === booking.paymentId?.toString());

        return {
            id: booking._id.toString(),
            customerName: String(booking.customerName || user?.fullName || ''),
            customerImage: String(user?.profilePicture || ''),
            service: String(service?.title || ''),
            date: String(booking.scheduledDate || ''),
            time: String(booking.scheduledTime || ''),
            duration: service.priceUnit === "PerHour" ? String(service?.duration || '') : service.priceUnit,
            location: address ? `${address.street}, ${address.city}` : '',
            payment: Number(payment?.amount || 0),
            paymentStatus: String(booking.paymentStatus || ''),
            status: booking.status as BookingStatus,
            description: String(service?.description || ''),
            customerPhone: String(booking.phone || ''),
            customerEmail: String(user?.email || ''),
            specialRequests: String(booking.instructions || ''),
            createdAt: booking.createdAt
                ? (booking.createdAt as Date).toISOString()
                : ''
        };
    });
}

