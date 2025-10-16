import { Types } from "mongoose";
import { IAddressRequest } from "../../interface/address";
import { IAddress } from "../../models/address";

export const toAddressModel = (userId: string, data: Partial<IAddressRequest>): Partial<IAddress> => {
    const [lat, lon] = data.locationCoords.split(",").map(Number);
    const locationCoords = {
        type: "Point" as const,
        coordinates: [lon, lat]
    };

    return {
        ...data,
        userId: new Types.ObjectId(userId),
        locationCoords
    } as Partial<IAddress>
}