import { Types } from "mongoose";
import { type IAddressRequest } from "../../interface/address.js";
import { type IAddress } from "../../models/address.js";

export const toAddressModel = (userId: string, data: Partial<IAddressRequest>): Partial<IAddress> => {
  const [lat, lon] = data.locationCoords.split(",").map(Number);
  const locationCoords = {
    type: "Point" as const,
    coordinates: [lon, lat],
  };

  return {
    ...data,
    userId: new Types.ObjectId(userId),
    locationCoords,
  } as Partial<IAddress>;
};
