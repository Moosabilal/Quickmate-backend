import { Types } from "mongoose";
export const toAddressModel = (userId, data) => {
    const [lat, lon] = data.locationCoords.split(",").map(Number);
    const locationCoords = {
        type: "Point",
        coordinates: [lon, lat],
    };
    return {
        ...data,
        userId: new Types.ObjectId(userId),
        locationCoords,
    };
};
