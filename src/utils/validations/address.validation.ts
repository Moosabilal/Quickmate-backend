import { z } from 'zod';

export const paramIdSchema = z.object({
    id: z.string().min(1, "ID is required"),
});

export const createAddressSchema = z.object({
    label: z.string().min(1, "Label is required."),
    street: z.string().min(1, "Street is required."),
    city: z.string().min(1, "City is required."),
    state: z.string().min(1, "State is required."),
    zip: z.string().min(5, "A valid ZIP code is required."),
    locationCoords: z.string(),
});

export const updateAddressSchema = z.object({
    label: z.string().min(1, "Label is required.").optional(),
    street: z.string().min(1, "Street is required.").optional(),
    city: z.string().min(1, "City is required.").optional(),
    state: z.string().min(1, "State is required.").optional(),
    zip: z.string().min(5, "A valid ZIP code is required.").optional(),
    locationCoords: z.string().optional(),
});