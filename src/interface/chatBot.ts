export interface IChatbotResponse {
    role: 'model';
    text: string;
    // --- ADD THESE OPTIONAL FIELDS ---
    action?: 'REQUIRE_PAYMENT'; 
    payload?: {
        orderId: string;
        amount: number;
        bookingData: any; // Or use IBookingRequest if available
    };
}

// ... (rest of your interfaces)