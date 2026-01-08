export interface IChatbotResponse {
  role: "model";
  text: string;
  action?: "REQUIRE_PAYMENT" | "REQUIRE_LOGIN";
  payload?: {
    orderId: string;
    amount: number;
    bookingData: IBookingRequest;
  };
  options?: IResponseOption[];
}

interface IBookingRequest {
  serviceId: string;
  providerId: string;
  customerName: string;
  phone: string;
  instructions?: string;
  addressId?: string;
  amount?: number;
  scheduledDate?: string;
  scheduledTime?: string;
}

export interface IChatPaymentVerify {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  bookingData: IBookingRequest;
}

export interface ITempAddress {
  id: string;
  label: string;
  street: string;
  city: string;
  lat: number;
  lng: number;
  index: number;
}

export interface IFoundProvider {
  serviceId: string;
  providerId: string;
  name: string;
  rating: number;
  price: number;
}

export interface IChatSessionContext {
  userId?: string;
  role?: string;
  customerName?: string;
  phone?: string;

  serviceSubCategoryId?: string;

  addressId?: string;
  address?: string;
  location?: {
    lat: number;
    lng: number;
  };
  tempAddressList?: ITempAddress[];

  radius?: number;
  date?: string;
  time?: string;

  lastFoundProviders?: IFoundProvider[];
  providerId?: string;

  serviceId?: string;
  amount?: number;
  instructions?: string;
}

export interface IToolExecutionResult {
  success?: boolean;
  error?: string;
  message?: string;

  servicesFound?: number;
  possibleMatches?: string[];

  addressesFound?: number;

  slotsFound?: number;

  providersFound?: number;
  providers?: IFoundProvider[];
  autoSelectedProvider?: IFoundProvider;
}

export type IResponseOption = { name: string } | ITempAddress | IFoundProvider | string;
