import { IProvider } from '../models/Providers';
import { IProviderProfile } from '../dto/provider.dto';

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
