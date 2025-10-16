import { Types } from "mongoose";

export interface IAddressRequest {
    id?: string
    userId: string | Types.ObjectId;
    label: string;
    street: string;
    city: string;
    state: string;
    zip: string;
    locationCoords?: string;
}
