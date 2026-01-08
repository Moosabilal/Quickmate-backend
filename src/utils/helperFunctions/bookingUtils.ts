import { convertTo24Hour } from "./convertTo24hrs";

export const getBookingTimes = (dateStr: string, timeStr: string, durationInMinutes: number) => {
  const time24 = convertTo24Hour(timeStr);
  const start = new Date(`${dateStr}T${time24}:00.000Z`);
  const end = new Date(start.getTime() + durationInMinutes * 60000);
  return { start, end };
};
