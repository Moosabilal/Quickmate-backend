import { type IAddressRequest } from "../../interface/address.js";
import { type IAddress } from "../../models/address.js";

export const toAddressRequestDTO = (address: IAddress): IAddressRequest => {
  return {
    id: address._id.toString(),
    userId: address.userId.toString(),
    label: address.label,
    street: address.street,
    city: address.city,
    state: address.state,
    zip: address.zip,
    locationCoords: `${address.locationCoords.coordinates[1]},${address.locationCoords.coordinates[0]}`,
  };
};
