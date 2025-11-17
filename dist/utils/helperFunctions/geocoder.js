"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.geocodeAddress = geocodeAddress;
const axios_1 = __importDefault(require("axios"));
function geocodeAddress(street, city, state, zip) {
    return __awaiter(this, void 0, void 0, function* () {
        const addressQuery = `${street}, ${city}, ${state}, ${zip}`;
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addressQuery)}&limit=1`;
        try {
            const response = yield axios_1.default.get(url, { headers: { 'User-Agent': 'QuickMateApp/1.0' } });
            if (response.data && response.data.length > 0) {
                return {
                    lat: parseFloat(response.data[0].lat),
                    lng: parseFloat(response.data[0].lon),
                };
            }
            throw new Error('Address not found by geocoder.');
        }
        catch (error) {
            console.error("Geocoding error:", error);
            throw new Error('Failed to find coordinates for that address.');
        }
    });
}
