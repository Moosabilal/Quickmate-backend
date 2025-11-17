"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatbotService = void 0;
const inversify_1 = require("inversify");
const generative_ai_1 = require("@google/generative-ai");
const nanoid_1 = require("nanoid");
const type_1 = __importDefault(require("../../di/type"));
const CustomError_1 = require("../../utils/CustomError");
const HttpStatusCode_1 = require("../../enums/HttpStatusCode");
const mongoose_1 = require("mongoose");
let ChatbotService = class ChatbotService {
    constructor(categoryService, sessionRepo, messageRepo, serviceRepository, categoryRepository, addressService, bookingService, providerService, paymentService, bookingRepository) {
        this.bookingRepository = bookingRepository;
        this.SYSTEM_PROMPT = `
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
        this.tools = [
            {
                name: "getAvailableCategories",
                description: "Fetch list of all main categories available.",
                parameters: { type: generative_ai_1.SchemaType.OBJECT, properties: {} }
            },
            {
                name: "getSubcategoriesForCategory",
                description: "Get subcategories or services under a main category.",
                parameters: {
                    type: generative_ai_1.SchemaType.OBJECT,
                    properties: { categoryName: { type: generative_ai_1.SchemaType.STRING } },
                    required: ["categoryName"]
                }
            },
            {
                name: "getUserAddresses",
                description: "Get list of user's saved addresses.",
                parameters: { type: generative_ai_1.SchemaType.OBJECT, properties: {} }
            },
            {
                name: "createAddress",
                description: "Create a new address for the logged-in user.",
                parameters: {
                    type: generative_ai_1.SchemaType.OBJECT,
                    properties: {
                        label: { type: generative_ai_1.SchemaType.STRING },
                        street: { type: generative_ai_1.SchemaType.STRING },
                        city: { type: generative_ai_1.SchemaType.STRING },
                        state: { type: generative_ai_1.SchemaType.STRING },
                        zip: { type: generative_ai_1.SchemaType.STRING }
                    },
                    required: ["label", "street", "city", "state", "zip"]
                }
            },
            {
                name: "createBooking",
                description: "Create a booking request (payment handled next).",
                parameters: {
                    type: generative_ai_1.SchemaType.OBJECT,
                    properties: {
                        serviceId: { type: generative_ai_1.SchemaType.STRING },
                        addressId: { type: generative_ai_1.SchemaType.STRING },
                        scheduledAt: { type: generative_ai_1.SchemaType.STRING }
                    },
                    required: ["serviceId", "addressId", "scheduledAt"]
                }
            }
        ];
        this._genAI = new generative_ai_1.GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
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
    startSession(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const sessionId = (0, nanoid_1.nanoid)(10);
            let finalUserId;
            if (!userId || userId === "undefined") {
                finalUserId = new mongoose_1.Types.ObjectId();
            }
            else {
                finalUserId = new mongoose_1.Types.ObjectId(userId);
            }
            const newSession = yield this._sessionRepo.create({
                userId: finalUserId,
                sessionId,
                context: { userId: finalUserId.toString() }
            });
            return newSession;
        });
    }
    getHistory(sessionId) {
        return __awaiter(this, void 0, void 0, function* () {
            const session = yield this._sessionRepo.findOne({ sessionId });
            if (!session)
                return [];
            return this._messageRepo.findAll({ sessionId: session._id });
        });
    }
    sendMessage(sessionId, userMessage) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const session = yield this._sessionRepo.findOne({ sessionId });
            if (!session)
                throw new CustomError_1.CustomError("Chat session not found", HttpStatusCode_1.HttpStatusCode.NOT_FOUND);
            yield this._messageRepo.create({ sessionId: session._id, role: "user", text: userMessage });
            const history = yield this._messageRepo.findAll({ sessionId: session._id });
            const chatHistory = history.map(msg => ({ role: msg.role, parts: [{ text: msg.text }] }));
            const model = this._genAI.getGenerativeModel({
                model: "gemini-2.5-flash",
                tools: [{ functionDeclarations: this.tools }]
            });
            const chat = model.startChat({ history: chatHistory });
            if (session.state === "awaiting_address_selection") {
                const input = userMessage.trim().toLowerCase();
                const addresses = ((_a = session.context) === null || _a === void 0 ? void 0 : _a.addresses) || [];
                if (!addresses.length) {
                    const msg = "Hmm, I couldn't find your saved addresses. Please try 'show address' again.";
                    yield this._messageRepo.create({ sessionId: session._id, role: "model", text: msg });
                    return { role: "model", text: msg };
                }
                const match = input.match(/\d+/);
                const selectedIndex = match ? parseInt(match[0]) : NaN;
                let selectedAddress = null;
                if (!isNaN(selectedIndex) && selectedIndex >= 1 && selectedIndex <= addresses.length) {
                    selectedAddress = addresses[selectedIndex - 1];
                }
                else {
                    selectedAddress = addresses.find(addr => {
                        var _a, _b;
                        return ((_a = addr.label) === null || _a === void 0 ? void 0 : _a.toLowerCase().includes(input)) ||
                            ((_b = addr.displayText) === null || _b === void 0 ? void 0 : _b.toLowerCase().includes(input));
                    });
                }
                if (!selectedAddress) {
                    const msg = "Please select a valid address number or name from the list.";
                    yield this._messageRepo.create({ sessionId: session._id, role: "model", text: msg });
                    return { role: "model", text: msg };
                }
                session.context.selectedAddress = selectedAddress;
                session.state = "address_selected";
                yield session.save();
                const confirmation = `You've chosen your '${selectedAddress.label}' address at ${selectedAddress.displayText}. When would you like me to schedule the service? Please provide a date and time.`;
                yield this._messageRepo.create({ sessionId: session._id, role: "model", text: confirmation });
                return { role: "model", text: confirmation };
            }
            const contextPrompt = `
        ${this.SYSTEM_PROMPT}
        CURRENT_CONTEXT: ${JSON.stringify(session.context)}
        USER_MESSAGE: ${userMessage}
    `;
            const result = yield chat.sendMessage(contextPrompt);
            const response = result.response;
            const functionCalls = response.functionCalls();
            if (functionCalls && functionCalls.length > 0) {
                const call = functionCalls[0];
                let toolResult = {};
                let botResponse = "";
                try {
                    switch (call.name) {
                        case "getAvailableCategories":
                            const categories = yield this._categoryService.getTopLevelCategoryNames();
                            toolResult = { categories };
                            botResponse = `Here are some categories you can explore: ${categories.join(", ")}. Which one interests you?`;
                            break;
                        case "getSubcategoriesForCategory":
                            const { categoryName } = call.args;
                            const subs = yield this._categoryService.getSubcategoriesForCategory(categoryName);
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
                            const addresses = yield this._addressService.getAddressesForUser(session.userId.toString());
                            if (!(addresses === null || addresses === void 0 ? void 0 : addresses.length)) {
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
                            session.context = Object.assign(Object.assign({}, session.context), { addresses: toolResult.addresses });
                            session.state = "awaiting_address_selection";
                            yield session.save();
                            botResponse = `Here are your saved addresses:\n${formatted}\n\nPlease reply with the number or name of the address you'd like to use.`;
                            break;
                        case "createAddress":
                            if (!session.userId)
                                throw new Error("User not logged in");
                            const newAddr = yield this._addressService.createAddress(call.args, session.userId.toString());
                            session.context.selectedAddress = newAddr;
                            botResponse = `Address saved successfully as "${newAddr.label}".`;
                            toolResult = { newAddress: newAddr };
                            break;
                        case "createBooking": {
                            const bookingData = call.args;
                            bookingData.userId = (_b = session.userId) === null || _b === void 0 ? void 0 : _b.toString();
                            const amount = 500;
                            const order = yield this._PaymentService.createOrder(amount);
                            session.context.pendingPayment = Object.assign(Object.assign({}, bookingData), { orderId: order.id, amount });
                            session.state = "awaiting_payment";
                            yield session.save();
                            botResponse = `Got it! Please complete your payment of ₹${amount} using this link:\n\n${process.env.CLIENT_URL}/payment?order_id=${order.id}\n\nAfter payment, I’ll confirm your booking automatically.`;
                            break;
                        }
                        default:
                            botResponse = "I'm not sure how to handle that yet.";
                            break;
                    }
                }
                catch (err) {
                    botResponse = "Sorry, something went wrong while processing your request.";
                    toolResult = { error: err.message };
                }
                yield chat.sendMessage([{ functionResponse: { name: call.name, response: toolResult } }]);
                yield this._messageRepo.create({ sessionId: session._id, role: "model", text: botResponse });
                yield session.save();
                return { role: "model", text: botResponse };
            }
            const textResponse = response.text() || "Sorry, could you clarify that?";
            yield this._messageRepo.create({ sessionId: session._id, role: "model", text: textResponse });
            return { role: "model", text: textResponse };
        });
    }
    createRazorpayOrder(userId, orderData) {
        return __awaiter(this, void 0, void 0, function* () {
            const { amount } = orderData;
            const order = yield this._PaymentService.createOrder(amount);
            return {
                id: order.id,
                amount,
                key: process.env.RAZORPAY_KEY_ID,
                currency: "INR",
                metadata: orderData
            };
        });
    }
    verifyRazorpayPayment(userId, paymentData) {
        return __awaiter(this, void 0, void 0, function* () {
            const verified = yield this._PaymentService.verifySignature(paymentData.razorpay_order_id, paymentData.razorpay_payment_id, paymentData.razorpay_signature);
            if (!verified)
                throw new Error("Payment verification failed");
            const metadata = paymentData.metadata;
            const booking = yield this._bookingRepository.create({
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
        });
    }
};
exports.ChatbotService = ChatbotService;
exports.ChatbotService = ChatbotService = __decorate([
    (0, inversify_1.injectable)(),
    __param(0, (0, inversify_1.inject)(type_1.default.CategoryService)),
    __param(1, (0, inversify_1.inject)(type_1.default.ChatSessionRepository)),
    __param(2, (0, inversify_1.inject)(type_1.default.ChatMessageRepository)),
    __param(3, (0, inversify_1.inject)(type_1.default.ServiceRepository)),
    __param(4, (0, inversify_1.inject)(type_1.default.CategoryRepository)),
    __param(5, (0, inversify_1.inject)(type_1.default.AddressService)),
    __param(6, (0, inversify_1.inject)(type_1.default.BookingService)),
    __param(7, (0, inversify_1.inject)(type_1.default.ProviderService)),
    __param(8, (0, inversify_1.inject)(type_1.default.PaymentService)),
    __param(9, (0, inversify_1.inject)(type_1.default.BookingRepository)),
    __metadata("design:paramtypes", [Object, Object, Object, Object, Object, Object, Object, Object, Object, Object])
], ChatbotService);
