import { inject, injectable } from "inversify";
import { GoogleGenerativeAI, FunctionDeclaration, SchemaType } from "@google/generative-ai";
import { nanoid } from "nanoid";
import TYPES from "../../di/type";
import { CustomError } from "../../utils/CustomError";
import { HttpStatusCode } from "../../enums/HttpStatusCode";
import { Types } from "mongoose";
import { IChatBotService } from "../interface/IChatBotService";
import { IChatSessionRepository } from "../../repositories/interface/IChatSessionRepository";
import { IChatMessageRepository } from "../../repositories/interface/IChatMessageRepository";
import { IChatSession } from "../../models/chatSession";
import { IChatMessage } from "../../models/chatMessage";
import { ICategoryService } from "../interface/ICategoryService";
import { IServiceRepository } from "../../repositories/interface/IServiceRepository";
import { ICategoryRepository } from "../../repositories/interface/ICategoryRepository";
import { IAddressService } from "../interface/IAddressService";
import { IBookingService } from "../interface/IBookingService";
import { IProviderService } from "../interface/IProviderService";
import { IChatbotResponse } from "../../interface/chatBot";
import { IBookingRequest } from "../../interface/booking";
import { IAddressData } from "../../interface/address";
import { IPaymentService } from "../interface/IPaymentService";
import { IBookingRepository } from "../../repositories/interface/IBookingRepository";

@injectable()
export class ChatbotService implements IChatBotService {
    private _genAI: GoogleGenerativeAI;
    private _categoryService: ICategoryService;
    private _sessionRepo: IChatSessionRepository;
    private _messageRepo: IChatMessageRepository;
    private _serviceRepository: IServiceRepository;
    private _categoryRepository: ICategoryRepository;
    private _addressService: IAddressService;
    private _bookingService: IBookingService;
    private _providerService: IProviderService;
    private _PaymentService: IPaymentService;
    private _bookingRepository: IBookingRepository;


    constructor(
        @inject(TYPES.CategoryService) categoryService: ICategoryService,
        @inject(TYPES.ChatSessionRepository) sessionRepo: IChatSessionRepository,
        @inject(TYPES.ChatMessageRepository) messageRepo: IChatMessageRepository,
        @inject(TYPES.ServiceRepository) serviceRepository: IServiceRepository,
        @inject(TYPES.CategoryRepository) categoryRepository: ICategoryRepository,
        @inject(TYPES.AddressService) addressService: IAddressService,
        @inject(TYPES.BookingService) bookingService: IBookingService,
        @inject(TYPES.ProviderService) providerService: IProviderService,
        @inject(TYPES.PaymentService) paymentService: IPaymentService,
        @inject(TYPES.BookingRepository) private bookingRepository: IBookingRepository,
    ) {
        this._genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
        this._categoryService = categoryService;
        this._sessionRepo = sessionRepo;
        this._messageRepo = messageRepo;
        this._serviceRepository = serviceRepository;
        this._categoryRepository = categoryRepository;
        this._addressService = addressService;
        this._bookingService = bookingService;
        this._providerService = providerService;
        this._PaymentService = paymentService;
        this._bookingRepository = bookingRepository;
    }

    private SYSTEM_PROMPT = `
    You are QuickMate AI, a friendly and professional assistant that helps users book home services easily.
    Be conversational and polite. 
    If the user chats casually, respond naturally.
    If the user wants to book a service, guide them step-by-step:
    1. Ask for a main category (cleaning, plumbing, beauty, etc.)
    2. Ask for a subcategory/service.
    3. Ask for their address.
    4. Ask for date & time.
    5. Confirm booking and trigger payment.
    Summarize all details before asking for confirmation.
`;


    private tools: FunctionDeclaration[] = [
        {
            name: "getAvailableCategories",
            description: "Fetch list of all main categories available.",
            parameters: { type: SchemaType.OBJECT, properties: {} }
        },
        {
            name: "getSubcategoriesForCategory",
            description: "Get subcategories or services under a main category.",
            parameters: {
                type: SchemaType.OBJECT,
                properties: { categoryName: { type: SchemaType.STRING } },
                required: ["categoryName"]
            }
        },
        {
            name: "getUserAddresses",
            description: "Get list of user's saved addresses.",
            parameters: { type: SchemaType.OBJECT, properties: {} }
        },
        {
            name: "createAddress",
            description: "Create a new address for the logged-in user.",
            parameters: {
                type: SchemaType.OBJECT,
                properties: {
                    label: { type: SchemaType.STRING },
                    street: { type: SchemaType.STRING },
                    city: { type: SchemaType.STRING },
                    state: { type: SchemaType.STRING },
                    zip: { type: SchemaType.STRING }
                },
                required: ["label", "street", "city", "state", "zip"]
            }
        },
        {
            name: "createBooking",
            description: "Create a booking request (payment handled next).",
            parameters: {
                type: SchemaType.OBJECT,
                properties: {
                    serviceId: { type: SchemaType.STRING },
                    addressId: { type: SchemaType.STRING },
                    scheduledAt: { type: SchemaType.STRING }
                },
                required: ["serviceId", "addressId", "scheduledAt"]
            }
        }
    ];

    public async startSession(userId?: string): Promise<IChatSession> {
        const sessionId = nanoid(10);
        const newSession = await this._sessionRepo.create({
            userId: userId ? new Types.ObjectId(userId) : undefined,
            sessionId,
            context: { userId: userId || null }
        });
        return newSession;
    }

    public async getHistory(sessionId: string): Promise<IChatMessage[]> {
        const session = await this._sessionRepo.findOne({ sessionId });
        if (!session) return [];
        return this._messageRepo.findAll({ sessionId: session._id });
    }

    public async sendMessage(sessionId: string, userMessage: string): Promise<IChatbotResponse> {
        const session = await this._sessionRepo.findOne({ sessionId });
        if (!session) throw new CustomError("Chat session not found", HttpStatusCode.NOT_FOUND);

        await this._messageRepo.create({ sessionId: session._id, role: "user", text: userMessage });

        const history = await this._messageRepo.findAll({ sessionId: session._id });
        const chatHistory = history.map(msg => ({ role: msg.role, parts: [{ text: msg.text }] }));

        const model = this._genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            tools: [{ functionDeclarations: this.tools }]
        });

        const chat = model.startChat({ history: chatHistory });

        if (session.state === "awaiting_address_selection") {
            const input = userMessage.trim().toLowerCase();
            const addresses = session.context?.addresses || [];

            if (!addresses.length) {
                const msg = "Hmm, I couldn't find your saved addresses. Please try 'show address' again.";
                await this._messageRepo.create({ sessionId: session._id, role: "model", text: msg });
                return { role: "model", text: msg };
            }

            const match = input.match(/\d+/);
            const selectedIndex = match ? parseInt(match[0]) : NaN;
            let selectedAddress = null;

            if (!isNaN(selectedIndex) && selectedIndex >= 1 && selectedIndex <= addresses.length) {
                selectedAddress = addresses[selectedIndex - 1];
            } else {
                selectedAddress = addresses.find(addr =>
                    addr.label?.toLowerCase().includes(input) ||
                    addr.displayText?.toLowerCase().includes(input)
                );
            }

            if (!selectedAddress) {
                const msg = "Please select a valid address number or name from the list.";
                await this._messageRepo.create({ sessionId: session._id, role: "model", text: msg });
                return { role: "model", text: msg };
            }

            session.context.selectedAddress = selectedAddress;
            session.state = "address_selected";
            await session.save();

            const confirmation = `You've chosen your '${selectedAddress.label}' address at ${selectedAddress.displayText}. When would you like me to schedule the service? Please provide a date and time.`;
            await this._messageRepo.create({ sessionId: session._id, role: "model", text: confirmation });
            return { role: "model", text: confirmation };
        }


        const contextPrompt = `
        ${this.SYSTEM_PROMPT}
        CURRENT_CONTEXT: ${JSON.stringify(session.context)}
        USER_MESSAGE: ${userMessage}
    `;

        const result = await chat.sendMessage(contextPrompt);
        const response = result.response;
        const functionCalls = response.functionCalls();

        if (functionCalls && functionCalls.length > 0) {
            const call = functionCalls[0];
            let toolResult: any = {};
            let botResponse = "";

            try {
                switch (call.name) {
                    case "getAvailableCategories":
                        const categories = await this._categoryService.getTopLevelCategoryNames();
                        toolResult = { categories };
                        botResponse = `Here are some categories you can explore: ${categories.join(", ")}. Which one interests you?`;
                        break;

                    case "getSubcategoriesForCategory":
                        const { categoryName } = call.args as { categoryName: string };
                        const subs = await this._categoryService.getSubcategoriesForCategory(categoryName);
                        toolResult = { subcategories: subs };
                        botResponse = subs.length
                            ? `The "${categoryName}" category has these services: ${subs.join(", ")}. Which one do you want?`
                            : `Sorry, I couldn’t find any services under "${categoryName}".`;
                        session.context.selectedCategory = categoryName;
                        break;

                    case "getUserAddresses":
                        if (!session.userId) {
                            toolResult = { error: "User not logged in" };
                            botResponse = "Could you please share your address for this booking?";
                            break;
                        }

                        const addresses = await this._addressService.getAddressesForUser(session.userId.toString());
                        if (!addresses?.length) {
                            toolResult = { addresses: [] };
                            botResponse = "You don’t have any saved addresses yet. Would you like to add a new one?";
                            break;
                        }

                        const formatted = addresses.map((addr, i) => {
                            const label = addr.label || `Address ${i + 1}`;
                            const details = `${addr.street}, ${addr.city}, ${addr.state} - ${addr.zip}`;
                            return `${i + 1}. ${label} — ${details}`;
                        }).join("\n");

                        toolResult = {
                            addresses: addresses.map((addr, i) => ({
                                id: addr._id,
                                label: addr.label || `Address ${i + 1}`,
                                displayText: `${addr.street}, ${addr.city}, ${addr.state} - ${addr.zip}`,
                                number: i + 1,
                            }))
                        };

                        session.context = { ...session.context, addresses: toolResult.addresses };
                        session.state = "awaiting_address_selection";
                        await session.save();

                        botResponse = `Here are your saved addresses:\n${formatted}\n\nPlease reply with the number or name of the address you'd like to use.`;
                        break;

                    case "createAddress":
                        if (!session.userId) throw new Error("User not logged in");
                        const newAddr = await this._addressService.createAddress(call.args as IAddressData, session.userId.toString());
                        session.context.selectedAddress = newAddr;
                        botResponse = `Address saved successfully as "${newAddr.label}".`;
                        toolResult = { newAddress: newAddr };
                        break;

                    case "createBooking": {
                        const bookingData = call.args as IBookingRequest;
                        bookingData.userId = session.userId?.toString();

                        const amount = 500;
                        const order = await this._PaymentService.createOrder(amount);

                        session.context.pendingPayment = {
                            ...bookingData,
                            orderId: order.id,
                            amount
                        };
                        session.state = "awaiting_payment";
                        await session.save();

                        botResponse = `Got it! Please complete your payment of ₹${amount} using this link:\n\n${process.env.CLIENT_URL}/payment?order_id=${order.id}\n\nAfter payment, I’ll confirm your booking automatically.`;
                        break;
                    }


                    default:
                        botResponse = "I'm not sure how to handle that yet.";
                        break;
                }

            } catch (err: any) {
                botResponse = "Sorry, something went wrong while processing your request.";
                toolResult = { error: err.message };
            }

            await chat.sendMessage([{ functionResponse: { name: call.name, response: toolResult } }]);
            await this._messageRepo.create({ sessionId: session._id, role: "model", text: botResponse });
            await session.save();
            return { role: "model", text: botResponse };
        }

        const textResponse = response.text() || "Sorry, could you clarify that?";
        await this._messageRepo.create({ sessionId: session._id, role: "model", text: textResponse });
        return { role: "model", text: textResponse };
    }

    async createRazorpayOrder(userId: string, orderData: any) {
        const { amount } = orderData;
        const order = await this._PaymentService.createOrder(amount);
        return {
            id: order.id,
            amount,
            key: process.env.RAZORPAY_KEY_ID,
            currency: "INR",
            metadata: orderData
        };
    }


    async verifyRazorpayPayment(userId: string, paymentData: any) {
        const verified = await this._PaymentService.verifySignature(
            paymentData.razorpay_order_id,
            paymentData.razorpay_payment_id,
            paymentData.razorpay_signature
        );
        if (!verified) throw new Error("Payment verification failed");

        const metadata = paymentData.metadata;
        const booking = await this._bookingRepository.create({
            userId,
            serviceId: metadata.serviceId,
            providerId: metadata.providerId,
            addressId: metadata.addressId,
            paymentStatus: "Paid",
            amount: String(metadata.amount),
            status: "Pending",
            scheduledDate: metadata.scheduledDate,
            scheduledTime: metadata.scheduledTime,
            createdBy: "Bot",
            paymentId: paymentData.razorpay_payment_id
        });
        return booking;
    }

}


