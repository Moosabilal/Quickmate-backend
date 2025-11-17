"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toAddressModel = void 0;
const mongoose_1 = require("mongoose");
const toAddressModel = (userId, data) => {
    const [lat, lon] = data.locationCoords.split(",").map(Number);
    const locationCoords = {
        type: "Point",
        coordinates: [lon, lat]
    };
    return Object.assign(Object.assign({}, data), { userId: new mongoose_1.Types.ObjectId(userId), locationCoords });
};
exports.toAddressModel = toAddressModel;
