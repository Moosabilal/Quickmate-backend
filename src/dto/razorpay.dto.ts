export interface RazorpayOrder {
  id: string;
  entity: 'order';
  amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt: string;
  status: string;
  attempts: number;
  notes: Record<string, string | number>; // ✅ FIXED THIS LINE
  offer_id: string | null;
  created_at: number;
}
