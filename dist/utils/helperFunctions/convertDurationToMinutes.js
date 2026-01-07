export const convertDurationToMinutes = (durationString) => {
    if (!durationString || !durationString.includes(":")) {
        return 0;
    }
    const [hours, minutes] = durationString.split(":").map(Number);
    if (isNaN(hours) || isNaN(minutes)) {
        return 0;
    }
    return hours * 60 + minutes;
};
