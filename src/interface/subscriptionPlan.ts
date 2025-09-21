export interface AdminSubscriptionPlanDTO {
  id?: string;
  name?: string;
  price?: number;
  durationInDays?: number;
  features?: string[];
  createdAt?: Date;
  updatedAt?: Date;
}