export interface RazorpayOrder {
  id: string;
  entity: string;
  amount: number | string;
  amount_paid: number | string;
  amount_due: number | string;
  currency: string;
  receipt?: string | null;
  status: string;
  attempts: number;
  notes?: Record<string, string | number> | [];
  offer_id?: string | null;
  created_at: number;
}
