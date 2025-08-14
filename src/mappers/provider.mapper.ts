import { IProvider } from '../models/Providers';
import { IProviderForChatListPage, IProviderProfile, IServiceAddPageResponse } from '../dto/provider.dto';
import { ICategory } from '../models/Categories';
import { IBooking } from '../models/Booking';
import { IService } from '../models/Service';

export function toProviderDTO(provider: IProvider): IProviderProfile {
  return {
    id: provider._id.toString(),
    userId: provider.userId.toString(),
    fullName: provider.fullName,
    phoneNumber: provider.phoneNumber,
    email: provider.email,
    serviceId: provider.serviceId.map(id => id.toString()),
    serviceLocation: provider.serviceLocation,
    serviceArea: provider.serviceArea,
    availableDays: provider.availableDays,
    timeSlot: provider.timeSlot,
    profilePhoto: provider.profilePhoto,
    earnings: provider.earnings,
    status: provider.status,
    totalBookings: provider.totalBookings,
    payoutPending: provider.payoutPending,
    rating: provider.rating,
    isVerified: provider.isVerified,
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
  services: IService[]
): IProviderForChatListPage[] {
  return providers.map((provider) => {
    const booking = bookings.find(
      (b) => b.providerId?.toString() === provider._id.toString()
    );
    console.log('the booking', booking)
    const providerServices = services.filter(
      (s) => s.providerId?.toString() === provider._id.toString()
    );
    console.log('the provider services', providerServices)

    return {
      id: provider._id.toString(),
      bookingId: booking?._id.toString(),
      name: provider.fullName,
      profilePicture: provider.profilePhoto || "",
      location: provider.serviceArea,
      isOnline: true, 
      services: providerServices.map((s) => s.title),
      description: providerServices[0]?.description || "",
    };
  });
}
