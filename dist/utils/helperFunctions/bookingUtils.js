import { convertTo24Hour } from "./convertTo24hrs.js";
export const getBookingTimes = (dateStr, timeStr, durationInMinutes) => {
    const time24 = convertTo24Hour(timeStr);
    const start = new Date(`${dateStr}T${time24}:00.000Z`);
    const end = new Date(start.getTime() + durationInMinutes * 60000);
    return { start, end };
};
