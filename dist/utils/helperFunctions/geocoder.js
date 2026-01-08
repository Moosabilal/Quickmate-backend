import axios from "axios";
export async function geocodeAddress(street, city, state, zip) {
    const addressQuery = `${street}, ${city}, ${state}, ${zip}`;
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addressQuery)}&limit=1`;
    try {
        const response = await axios.get(url, {
            headers: { "User-Agent": "QuickMateApp/1.0" },
        });
        if (response.data && response.data.length > 0) {
            return {
                lat: parseFloat(response.data[0].lat),
                lng: parseFloat(response.data[0].lon),
            };
        }
        throw new Error("Address not found by geocoder.");
    }
    catch (error) {
        console.error("Geocoding error:", error);
        throw new Error("Failed to find coordinates for that address.");
    }
}
