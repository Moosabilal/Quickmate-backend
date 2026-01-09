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
import { inject, injectable } from "inversify";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { nanoid } from "nanoid";
import TYPES from "../../di/type.js";
import { CustomError } from "../../utils/CustomError.js";
import { HttpStatusCode } from "../../enums/HttpStatusCode.js";
import { Types } from "mongoose";
import {} from "../interface/IChatBotService.js";
import {} from "../../repositories/interface/IChatSessionRepository.js";
import {} from "../../repositories/interface/IChatMessageRepository.js";
import {} from "../../models/chatSession.js";
import {} from "../../models/chatMessage.js";
import {} from "../interface/ICategoryService.js";
import {} from "../../repositories/interface/IServiceRepository.js";
import {} from "../../repositories/interface/ICategoryRepository.js";
import {} from "../interface/IAddressService.js";
import {} from "../interface/IBookingService.js";
import {} from "../interface/IProviderService.js";
import {} from "../interface/IPaymentService.js";
import {} from "../../repositories/interface/IBookingRepository.js";
import {} from "../../repositories/interface/IUserRepository.js";
import {} from "../../interface/chatBot.js";
import { PaymentMethod, PaymentStatus, Roles } from "../../enums/userRoles.js";
import {} from "../../repositories/interface/ICommissonRuleRepository.js";
import {} from "../../repositories/interface/ISubscriptionPlanRepository.js";
import { verifyPaymentSignature } from "../../utils/razorpay.js";
import { calculateCommission } from "../../utils/helperFunctions/commissionRule.js";
import { applySubscriptionAdjustments } from "../../utils/helperFunctions/subscription.js";
import { convertDurationToMinutes } from "../../utils/helperFunctions/convertDurationToMinutes.js";
import {} from "../../repositories/interface/IProviderRepository.js";
import { BookingStatus } from "../../enums/booking.enum.js";
import {} from "../../repositories/interface/IPaymentRepository.js";
import logger from "../../logger/logger.js";
import Fuse from "fuse.js";
import {} from "../../models/Booking.js";
const BOOKING_KEYWORDS = ["book", "schedule", "appointment", "clean", "repair", "service", "want"];
let ChatbotService = class ChatbotService {
    _genAI;
    _categoryService;
    _sessionRepo;
    _messageRepo;
    _serviceRepository;
    _categoryRepository;
    _addressService;
    _bookingService;
    _providerRepository;
    _providerService;
    _userRepository;
    _PaymentService;
    _paymentRepository;
    _bookingRepository;
    _commissionRuleRepository;
    _subscriptionPlanRepository;
    constructor(categoryService, sessionRepo, messageRepo, serviceRepository, categoryRepository, addressService, bookingService, providerRepository, providerService, userRepository, paymentService, paymentRepository, bookingRepository, commissionRuleRepository, subscriptionPlanRepository) {
        this._genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
        this._categoryService = categoryService;
        this._sessionRepo = sessionRepo;
        this._messageRepo = messageRepo;
        this._serviceRepository = serviceRepository;
        this._categoryRepository = categoryRepository;
        this._addressService = addressService;
        this._bookingService = bookingService;
        this._providerRepository = providerRepository;
        this._providerService = providerService;
        this._userRepository = userRepository;
        this._PaymentService = paymentService;
        this._paymentRepository = paymentRepository;
        this._bookingRepository = bookingRepository;
        this._commissionRuleRepository = commissionRuleRepository;
        this._subscriptionPlanRepository = subscriptionPlanRepository;
    }
    SYSTEM_PROMPT = `
    You are QuickMate AI, a friendly and professional assistant. Your goal is to help users book a service.
    **CRITICAL RULE: HANDLING CHANGES & RESETS**
    - If the user wants to change something you've already asked for (e.g., "change address", "pick a different time", "start over", "book something else"), you MUST clear the relevant information from your context to go back to that step.
    - Example 1: If 'addressId' is already set and user says "use a different address", you must clear 'addressId' and 'location' from the context and call 'getUserAddresses' again.
    - Example 2: If 'serviceSubCategoryId' is set and user says "actually, I need a cleaner", you must clear 'serviceSubCategoryId', 'providerId', 'date', 'time', etc., and call 'findSubcategoryByName' for "cleaner".

    **CRITICAL RULE: HANDLING SEARCH FAILURES**
    - If the 'findSubcategoryByName' tool returns an error with "possibleMatches", you MUST present those options to the user.
    - Example: "I couldn't find 'X', but did you mean 'Y' or 'Z'?"
    **CRITICAL RULE: LISTING ALL SERVICES**
    - If the user asks a general question about what services are available (e.g., "what can you do?", "list all services", "what do you offer?"), you MUST call the 'listAllServices' tool.


    **CRITICAL RULE: GENERAL QUESTIONS**
    - If the user asks a general question about the website or how it works, you should answer it based on the Q&A section below. Do NOT use a tool unless the question is about booking a service.
    ---
    **Q&A / Website Information:**
    - **What is QuickMate?** QuickMate is a platform that connects users with trusted local service providers for tasks like cleaning, repairs, and more.
    - **How does payment work?** We use Razorpay for secure online payments. You pay upfront to confirm your booking, and the provider is paid after the service is completed.
    - **Can I trust the providers?** Yes, all our providers are vetted and have profiles with ratings from other users to help you choose the best fit.
    - **How do I become a provider?** You can sign up as a provider through our website. You'll need to create a profile, list your services, and set your availability.
    - **How do I book a service manually?** Besides chatting with me, you can also browse our services on the website. Just go to the 'Services' page, find what you need, and you can book a provider directly from there.
    ---

    **CRITICAL RULE: OUT OF SCOPE QUESTIONS**
    - You are strictly a booking assistant for QuickMate.
    - If the user asks about topics unrelated to QuickMate, booking services, or home maintenance (e.g., "What is JavaScript?", "Write me a poem", "What is the weather in Paris?"), you MUST politely refuse.
    - Standard Refusal Response: "I'm sorry, I can only help you with booking home services or answering questions about QuickMate. How can I help you with that today?"

    CRITICAL RULE: You MUST follow these steps in order. Ask for only ONE piece of information at a time.

    CRITICAL RULE: You MUST save important details (serviceId, providerId, addressId, date, time) to the session.context as you learn them.

    **Step 1: Greet & Find Service**
    - User: "I need a kitchen cleaner"
    - You: (Call 'findSubcategoryByName' with 'serviceName: "kitchen cleaner"'. This finds the Subcategory ID.)
    - (The tool returns the serviceName. Save 'serviceId' and 'subCategoryId' to context.)
    - You: "Great, you've selected [Service Name]. To find providers, I need your address. Do you have saved Address"

    **Step 2: Get Address**
    - (Call 'getUserAddresses'.)
    - If the tool returns 'addressesFound: 0': You MUST stop and tell the user to add an address in their profile page. Do not ask for address details in the chat. Your response should be: "It looks like you don't have any saved addresses. Please go to your profile to add an address, then come back to continue booking."
    - If addresses exist: "I found your saved addresses. Which one would you like to use?" (The frontend will show buttons).
    - (User selects an address. The system will handle saving the 'addressId' and 'location' to the context.)

    **Step 3: Get Radius & Date**
    - You: "Great. How far are you willing to search for a provider? (e.g., 10km, 25km)"
    - (User gives radius. Save 'radius' to context.)
    - You: "What date would you like this service? (e.g. YYYY-MM-DD)"
    - (User gives date. Save 'date' to context.)

    **Step 4: Get Slots**
    - (You now have: subCategoryId, location, radius, and date. Call 'getAvailableTimeSlots'.)
    - (The tool returns a list of slots, e.g., ["09:00 AM", "10:00 AM", "02:00 PM"].)
    - You: "I found several open slots on that day. Which one works for you?"
    - (User gives time. Save 'time' to context.)

    **Step 5: Get Providers**
    - (You now have the subCategoryId and the specific time. Call 'findAvailableProvidersForSlot'.)
    - (The tool returns a list of providers: 1. John (Rating: 4.5, Price: 150), 2. Jane (Rating: 4.8, Price: 180).)
    - You: "Perfect. I found these providers available at that time: [List them]. Which one would you like to book?"
    - (User chooses 'John'. You **save John's 'serviceId', 'providerId', and 'price' (as 'amount')** to your context.)

    **Step 6: Get Final Details & Confirm**
    - You: "To finalize the booking, I just need your full name and phone number. What is your full name?"
    - (User gives name. Save 'customerName' to context.)
    - You: "And your phone number?"
    - (User gives phone. Save 'phone' to context.)
    - You: (Format your response with newlines for readability) "Okay! Just to confirm your booking details:
    
    - **Service:** [Service Name]
    - **Provider:** [Provider Name]
    - **When:** [Date] at [Time]
    - **Where:** [Address]
    - **Total:** [Amount]
    
    Is this all correct?"

    **Step 7: Payment**
    - If the user confirms with phrases like "yes", "ok", "correct", "proceed", "pay now", etc., you MUST call the 'initiatePayment' tool.
    - (Your final response to the user will be: "Please complete your payment to confirm the booking.")
    - If the user rejects with "no", "cancel", "I don't want it", "change something", etc., you MUST ask them what they want to change, following the "HANDLING CHANGES & RESETS" rule.
    `;
    tools = [
        {
            name: "findSubcategoryByName",
            description: "Finds a specific service/subcategory by its name, e.g., 'kitchen cleaning'. This is the first step.",
            parameters: {
                type: SchemaType.OBJECT,
                properties: { serviceName: { type: SchemaType.STRING } },
                required: ["serviceName"],
            },
        },
        {
            name: "listAllServices",
            description: "Lists all available services when the user asks a general question like 'what services do you have?' or 'show me all services'.",
            parameters: { type: SchemaType.OBJECT, properties: {} },
        },
        {
            name: "getUserAddresses",
            description: "Get list of user's saved addresses. Only works if the user is logged in.",
            parameters: { type: SchemaType.OBJECT, properties: {} },
        },
        {
            name: "getAvailableTimeSlots",
            description: "Gets all available 1-hour time slots for a service, location, radius, and date.",
            parameters: {
                type: SchemaType.OBJECT,
                properties: {
                    date: { type: SchemaType.STRING, description: "YYYY-MM-DD" },
                    radius: {
                        type: SchemaType.NUMBER,
                        description: "Search radius in km, e.g., 10",
                    },
                },
                required: ["date", "radius"],
            },
        },
        {
            name: "findAvailableProvidersForSlot",
            description: "Finds providers who are available for a specific, chosen time slot.",
            parameters: {
                type: SchemaType.OBJECT,
                properties: {
                    time: { type: SchemaType.STRING, description: "hh:mm AM/PM" },
                },
                required: ["time"],
            },
        },
        {
            name: "initiatePayment",
            description: "The final step. Gathers all context and creates the payment order for the user.",
            parameters: {
                type: SchemaType.OBJECT,
                properties: {
                    customerName: { type: SchemaType.STRING },
                    phone: { type: SchemaType.STRING },
                    instructions: { type: SchemaType.STRING },
                },
                required: ["customerName", "phone"],
            },
        },
    ];
    async startSession(userId) {
        let userRole = Roles.USER;
        if (userId && userId !== "undefined") {
            const user = await this._userRepository.findById(userId);
            if (user) {
                userRole = user.role;
            }
        }
        const sessionId = nanoid(10);
        const newSession = await this._sessionRepo.create({
            userId: userId && userId !== "undefined" ? new Types.ObjectId(userId) : undefined,
            sessionId: sessionId,
            context: {
                userId: userId || null,
                role: userRole,
            },
        });
        return newSession;
    }
    async getHistory(sessionId) {
        const session = await this._sessionRepo.findOne({ sessionId });
        if (!session)
            return [];
        return this._messageRepo.findAll({ sessionId: session._id });
    }
    async sendMessage(sessionId, userMessage) {
        logger.info(`[Chatbot] 📨 New message for session ${sessionId}: "${userMessage}"`);
        const session = await this._sessionRepo.findOne({ sessionId });
        if (!session) {
            throw new CustomError("Chat session not found", HttpStatusCode.NOT_FOUND);
        }
        if (!session.userId) {
            const lowerMsg = userMessage.toLowerCase();
            const hasBookingIntent = BOOKING_KEYWORDS.some((keyword) => lowerMsg.includes(keyword));
            if (hasBookingIntent) {
                await this._messageRepo.create({
                    sessionId: session._id,
                    role: "user",
                    text: userMessage,
                });
                const loginMsg = "To help you book a service, I need you to log in first. Please log in to continue.";
                await this._messageRepo.create({
                    sessionId: session._id,
                    role: "model",
                    text: loginMsg,
                });
                return {
                    role: "model",
                    text: loginMsg,
                    action: "REQUIRE_LOGIN",
                };
            }
        }
        if (!session.context.serviceSubCategoryId) {
            const category = await this._categoryRepository.findSubCategoryByName(userMessage);
            if (category) {
                logger.info(`[Chatbot] 📝 User confirmed service: ${category.name}`);
                const newContext = { ...session.context };
                newContext.serviceSubCategoryId = category._id.toString();
                session.context = newContext;
                session.markModified("context");
                await session.save();
            }
        }
        if (session.context.tempAddressList && !session.context.addressId) {
            const match = userMessage.match(/\b(?:option|select|choose|pick)?\s*(\d+)\b/i);
            if (match) {
                const index = parseInt(match[1]) - 1;
                if (session.context.tempAddressList[index]) {
                    const selected = session.context.tempAddressList[index];
                    const newContext = { ...session.context };
                    newContext.addressId = selected.id;
                    newContext.location = {
                        lat: selected.lat,
                        lng: selected.lng,
                    };
                    newContext.address = `${selected.label} (${selected.street}, ${selected.city})`;
                    delete newContext.tempAddressList;
                    session.context = newContext;
                    session.markModified("context");
                    await session.save();
                }
            }
        }
        if (session.context.lastFoundProviders && !session.context.providerId) {
            const match = userMessage.match(/\b(?:option|select|choose|pick)?\s*(\d+)\b/i);
            if (match) {
                const index = parseInt(match[1]) - 1;
                if (session.context.lastFoundProviders[index]) {
                    const selected = session.context.lastFoundProviders[index];
                    logger.info(`[Chatbot] 📍 User selected provider #${index + 1}: ${selected.name}`);
                    const newContext = { ...session.context };
                    newContext.providerId = selected.providerId;
                    newContext.serviceId = selected.serviceId;
                    newContext.amount = selected.price;
                    session.context = newContext;
                    session.markModified("context");
                    await session.save();
                }
            }
        }
        const workingContext = JSON.parse(JSON.stringify(session.context));
        logger.info(`[Chatbot] Context (Start of Turn):`, JSON.stringify(workingContext, null, 2));
        await this._messageRepo.create({
            sessionId: session._id,
            role: "user",
            text: userMessage,
        });
        const history = await this._messageRepo.findAll({ sessionId: session._id });
        const chatHistory = history.map((msg) => ({
            role: msg.role,
            parts: [{ text: msg.text }],
        }));
        const model = this._genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            tools: [{ functionDeclarations: this.tools }],
        });
        const chat = model.startChat({ history: chatHistory });
        const context = session.context;
        let progressReport = "CURRENT PROGRESS:\n";
        if (context.serviceSubCategoryId) {
            progressReport += "✅ Step 1 (Service): COMPLETE. Service ID found.\n";
        }
        else {
            progressReport += "❌ Step 1 (Service): PENDING. You need to find the service name.\n";
        }
        if (context.addressId && context.location) {
            progressReport += "✅ Step 2 (Address): COMPLETE. Address selected.\n";
        }
        else {
            progressReport += "❌ Step 2 (Address): PENDING. You need to get the user's address.\n";
        }
        if (context.radius && context.date) {
            progressReport += `✅ Step 3 (Radius/Date): COMPLETE. Radius: ${context.radius}, Date: ${context.date}.\n`;
        }
        else {
            progressReport += "❌ Step 3 (Radius/Date): PENDING. You need radius and date.\n";
        }
        if (context.time) {
            progressReport += `✅ Step 4 (Time): COMPLETE. Time selected: ${context.time}.\n`;
        }
        else {
            progressReport += "❌ Step 4 (Time): PENDING. Call 'getAvailableTimeSlots' using the date and radius.\n";
        }
        if (context.providerId) {
            progressReport += "✅ Step 5 (Provider): COMPLETE. Provider selected.\n";
        }
        else {
            progressReport += "❌ Step 5 (Provider): PENDING. After time is picked, call 'findAvailableProvidersForSlot'.\n";
        }
        const contextPrompt = `
            SYSTEM_PROMPT: ${this.SYSTEM_PROMPT} 
            
            ${progressReport}
            
            CURRENT_CONTEXT: ${JSON.stringify(session.context)}
            
            USER_MESSAGE: ${userMessage}
        `;
        logger.info(`[Chatbot] 🚀 Sending to Gemini...`);
        let result;
        try {
            result = await chat.sendMessage(contextPrompt);
        }
        catch (error) {
            if (error instanceof Error && (error.message.includes("429") || error.message.includes("quota"))) {
                return {
                    role: "model",
                    text: "Exceeded request limit. Please try again later.",
                };
            }
            throw error;
        }
        const response = result.response;
        const functionCalls = response.functionCalls();
        if (functionCalls && functionCalls.length > 0) {
            const call = functionCalls[0];
            logger.info(`[Chatbot] 🛠️ Gemini wants to call tool: ${call.name}`);
            logger.info(`[Chatbot] 📦 Tool Arguments:`, JSON.stringify(call.args, null, 2));
            let toolResult;
            let botResponseText = null;
            let responseOptions = undefined;
            const context = session.context || {};
            const currentContext = { ...session.context };
            try {
                switch (call.name) {
                    case "findSubcategoryByName": {
                        const { serviceName } = call.args;
                        const category = await this._categoryRepository.findSubCategoryByName(serviceName);
                        if (category) {
                            logger.info(`[Chatbot] Exact match found for: ${serviceName}`);
                            session.context = {
                                userId: session.context.userId,
                                role: session.context.role,
                                customerName: session.context.customerName,
                                phone: session.context.phone,
                                serviceSubCategoryId: category._id.toString(),
                            };
                            session.markModified("context");
                            await session.save();
                            const suggestionOptions = [{ name: category.name }];
                            toolResult = {
                                servicesFound: 1,
                                possibleMatches: suggestionOptions.map((s) => s.name),
                            };
                            responseOptions = suggestionOptions;
                        }
                        else {
                            logger.warn(`[Chatbot] Exact match failed for: ${serviceName}. Trying fuzzy search...`);
                            const allSubCategories = (await this._categoryRepository.findAllActiveSubCategories());
                            const fuse = new Fuse(allSubCategories, {
                                keys: ["name"],
                                includeScore: true,
                                threshold: 0.9,
                            });
                            const results = fuse.search(serviceName);
                            const suggestions = results.map((result) => result.item);
                            if (suggestions.length > 0) {
                                logger.info(`[Chatbot] Found suggestions:`, suggestions);
                                const suggestionOptions = suggestions.slice(0, 5).map((s) => ({ name: s.name }));
                                toolResult = {
                                    servicesFound: suggestionOptions.length,
                                    possibleMatches: suggestionOptions.map((s) => s.name),
                                };
                                responseOptions = suggestionOptions;
                            }
                            else {
                                logger.warn(`[Chatbot] No relevant suggestions found for '${serviceName}'.`);
                                toolResult = {
                                    error: `Sorry, I couldn't find any services matching '${serviceName}'. You can ask me to list all services to see what's available.`,
                                };
                            }
                        }
                        break;
                    }
                    case "listAllServices": {
                        logger.info(`[Chatbot] Tool: Listing all available services.`);
                        const allServices = await this._categoryRepository.findAllActiveSubCategories();
                        const serviceOptions = allServices.map((s) => ({ name: s.name }));
                        toolResult = { servicesFound: serviceOptions.length };
                        responseOptions = serviceOptions;
                        logger.info(`[Chatbot] Found ${serviceOptions.length} services to show.`);
                        break;
                    }
                    case "getUserAddresses": {
                        if (!session.userId) {
                            logger.info(`[Chatbot] ❌ User not logged in. Cannot fetch addresses.`);
                            toolResult = { addressesFound: 0, error: "User not logged in." };
                        }
                        else {
                            try {
                                const addresses = await this._addressService.getAddressesForUser(session.userId.toString());
                                logger.info(`[Chatbot] ✓ Found ${addresses.length} addresses for user.`);
                                const addressList = addresses.map((a, i) => {
                                    const converted = {
                                        id: a._id.toString(),
                                        label: a.label,
                                        street: a.street,
                                        city: a.city,
                                        lat: a.locationCoords?.coordinates?.[1],
                                        lng: a.locationCoords?.coordinates?.[0],
                                        index: i + 1,
                                    };
                                    return converted;
                                });
                                currentContext.tempAddressList = addressList;
                                workingContext.tempAddressList = addressList;
                                session.context = currentContext;
                                session.markModified("context");
                                await session.save();
                                toolResult = { addressesFound: addressList.length };
                                responseOptions = addressList;
                            }
                            catch (err) {
                                logger.error("[ERROR] Failed fetching addresses:", err);
                                toolResult = { error: "Failed to fetch addresses." };
                            }
                        }
                        break;
                    }
                    case "getAvailableTimeSlots": {
                        const { date, radius } = call.args;
                        logger.info(`[Chatbot] Getting slots for date: ${date}, radius: ${radius}km`);
                        if (radius < 5 || radius > 25) {
                            logger.warn(`[Chatbot] ❗ Invalid radius: ${radius}km. Must be between 5 and 25.`);
                            toolResult = {
                                error: `The search radius must be between 5km and 25km. Please provide a valid distance.`,
                            };
                            break;
                        }
                        const requestedDate = new Date(date);
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        if (isNaN(requestedDate.getTime()) || requestedDate < today) {
                            logger.warn(`[Chatbot] ❗ Invalid or past date provided: ${date}`);
                            toolResult = {
                                error: `The date provided (${date}) is either in the past or not a valid date. Please provide a future date in YYYY-MM-DD format.`,
                            };
                            delete currentContext.date;
                            break;
                        }
                        currentContext.date = date;
                        currentContext.radius = radius;
                        session.context = currentContext;
                        session.markModified("context");
                        logger.info(`[Chatbot] Current Context the second one:`, JSON.stringify(currentContext, null, 2));
                        if (!currentContext.location && currentContext.tempAddressList) {
                            logger.warn(`[Chatbot] Missing location but temp address list exists. User likely selected by number.`);
                            toolResult = {
                                error: "I don't have a location yet. Please ask the user to select an address first.",
                            };
                            break;
                        }
                        if (!currentContext.serviceSubCategoryId || !currentContext.location) {
                            logger.warn(`[Chatbot] Missing context. SubCat: ${currentContext.serviceSubCategoryId}, Loc: ${JSON.stringify(currentContext.location)}`);
                            toolResult = {
                                error: "Missing service or address. You must ask for them first.",
                            };
                            await session.save();
                            break;
                        }
                        let slots = await this._providerService.getAvailabilityByLocation(session.userId?.toString() || "", currentContext.serviceSubCategoryId, currentContext.location.lat, currentContext.location.lng, radius, date, date);
                        if (session.context.role === Roles.PROVIDER && session.userId) {
                            const currentProviderId = await this._providerRepository.getProviderId(session.userId.toString());
                            if (currentProviderId) {
                                logger.info(`[Chatbot] 🛡️ Provider user detected. Filtering out their own slots. Provider ID: ${currentProviderId}`);
                                slots = slots.filter((p) => p.providerId.toString() !== currentProviderId);
                            }
                        }
                        const allSlots = slots.flatMap((provider) => provider.availableSlots.map((s) => new Date(s.start).toLocaleTimeString("en-US", {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: true,
                        })));
                        const uniqueSlots = [...new Set(allSlots)].sort();
                        logger.info(`[Chatbot] Found ${uniqueSlots.length} unique slots.`);
                        toolResult = { slotsFound: uniqueSlots.length };
                        responseOptions = uniqueSlots;
                        await session.save();
                        break;
                    }
                    case "findAvailableProvidersForSlot": {
                        logger.info(`[Chatbot] Raw function call args:`, call.args);
                        const { time } = call.args;
                        logger.info(`[Chatbot] Extracted time: ${time}`);
                        workingContext.time = time;
                        session.context.time = time;
                        logger.info(`[Chatbot] Updated context.time = ${session.context.time}`);
                        logger.info(`[Chatbot] Current context before validation:`, JSON.stringify(context, null, 2));
                        if (!workingContext.serviceSubCategoryId ||
                            !workingContext.location ||
                            !workingContext.radius ||
                            !workingContext.date) {
                            toolResult = {
                                error: "Missing context. You must get service, address, radius, and date first.",
                            };
                            logger.info(`[Chatbot] Returning ERROR toolResult for missing context:`, toolResult);
                            break;
                        }
                        const nearbyProviders = await this._providerService.findNearbyProviders([context.location.lng, context.location.lat], context.radius || 10, context.serviceSubCategoryId);
                        logger.info(`[Chatbot] Nearby provider raw result:`, nearbyProviders);
                        if (!nearbyProviders || nearbyProviders.length === 0) {
                            logger.info(`[Chatbot] ❗ No providers found nearby.`);
                            toolResult = {
                                providers: [],
                                message: "No providers found within that radius.",
                            };
                            break;
                        }
                        logger.info(`[Chatbot] Found ${nearbyProviders.length} providers in range.`);
                        const providersInRange = nearbyProviders.map((p) => p.id.toString());
                        logger.info(`[Chatbot] Provider IDs in range:`, providersInRange);
                        const services = await this._serviceRepository.findServicesWithProvider(context.serviceSubCategoryId, undefined);
                        logger.info(`[Chatbot] Raw services fetched:`, services.length);
                        const servicesInRange = services.filter((s) => providersInRange.includes(s.provider._id.toString()));
                        logger.info(`[Chatbot] Services matching providers in range: ${servicesInRange.length}`);
                        if (!servicesInRange.length) {
                            logger.info(`[Chatbot] ❗ Providers found, but none have matching service documents.`);
                            toolResult = { providers: [] };
                            break;
                        }
                        const providerIds = servicesInRange.map((s) => s.provider._id.toString());
                        logger.info(`[Chatbot] Checking availability for provider IDs:`, providerIds);
                        let availableProviders = await this._providerService.findProvidersAvailableAtSlot(providerIds, context.date, time);
                        if (session.context.role === Roles.PROVIDER && session.userId) {
                            const currentProviderId = await this._providerRepository.getProviderId(session.userId.toString());
                            if (currentProviderId) {
                                logger.info(`[Chatbot] 🛡️ Provider user detected. Filtering out their own provider profile. Provider ID: ${currentProviderId}`);
                                availableProviders = availableProviders.filter((p) => p._id.toString() !== currentProviderId);
                            }
                        }
                        logger.info(`[Chatbot] Available providers after time check:`, availableProviders);
                        const providerList = availableProviders.map((p) => {
                            const service = servicesInRange.find((s) => s.provider._id.toString() === p._id.toString());
                            logger.info(`[Chatbot] Mapping provider ${p._id}:`, { service });
                            return {
                                serviceId: service._id.toString(),
                                providerId: p._id.toString(),
                                name: p.fullName,
                                rating: p.rating,
                                price: service.price,
                            };
                        });
                        logger.info(`[Chatbot] ✅ Final provider list:`, providerList);
                        if (providerList.length === 1) {
                            const selected = providerList[0];
                            logger.info(`[Chatbot] 📍 Auto-selecting the only available provider: ${selected.name}`);
                            workingContext.providerId = selected.providerId;
                            workingContext.serviceId = selected.serviceId;
                            workingContext.amount = selected.price;
                            delete workingContext.lastFoundProviders;
                            session.context = workingContext;
                            session.markModified("context");
                            await session.save();
                            toolResult = { autoSelectedProvider: selected };
                            responseOptions = providerList;
                        }
                        else if (providerList.length > 1) {
                            workingContext.lastFoundProviders = providerList;
                            session.context.lastFoundProviders = providerList;
                            session.markModified("context");
                            await session.save();
                            toolResult = { providersFound: providerList.length };
                            responseOptions = providerList;
                            logger.info(`[Chatbot] Returning toolResult:`, toolResult);
                        }
                        else {
                            toolResult = {
                                providersFound: 0,
                                message: "No providers were available for that specific time.",
                            };
                        }
                        break;
                    }
                    case "initiatePayment": {
                        const { customerName, phone, instructions } = call.args;
                        workingContext.customerName = customerName;
                        workingContext.phone = phone;
                        workingContext.instructions = instructions;
                        logger.info(`[Chatbot] Updated context after adding customer details:`, JSON.stringify(workingContext, null, 2));
                        if (!workingContext.providerId) {
                            const match = userMessage.match(/^\s*(\d+)\s*$/);
                            if (match && workingContext.lastFoundProviders) {
                                const index = parseInt(match[1]) - 1;
                                if (workingContext.lastFoundProviders[index]) {
                                    logger.info(`[Chatbot] User selected provider #${index + 1}`);
                                    workingContext.providerId = workingContext.lastFoundProviders[index].providerId;
                                    logger.info(`[Chatbot] Inferred provider selection: ${workingContext.providerId}`);
                                }
                            }
                        }
                        const chosenProvider = workingContext.lastFoundProviders?.find((p) => p.providerId === workingContext.providerId);
                        if (!chosenProvider) {
                            logger.error(`[Chatbot] ❌ No matching provider found for providerId: ${context.providerId}`);
                        }
                        else {
                            logger.info(`[Chatbot] Found chosen provider:`, chosenProvider);
                            workingContext.serviceId = chosenProvider.serviceId;
                            workingContext.amount = chosenProvider.price;
                        }
                        await session.save();
                        logger.info(`working context serviceId: ${workingContext}`);
                        if (!workingContext.serviceId ||
                            !workingContext.providerId ||
                            !workingContext.addressId ||
                            !workingContext.date ||
                            !workingContext.time ||
                            !workingContext.amount) {
                            logger.error(`[Chatbot] ❌ Missing critical booking info.`);
                            logger.error(`[Chatbot] Full Context:`, JSON.stringify(context, null, 2));
                            toolResult = {
                                error: "Missing critical booking info. You must confirm all details with the user first.",
                            };
                            logger.info(`[Chatbot] Returning error toolResult.`);
                            break;
                        }
                        const order = await this._PaymentService.createOrder(workingContext.amount);
                        logger.info(` - orderId: ${order.id}`);
                        const response = {
                            role: "model",
                            text: "Great! Please complete your payment to confirm the booking.",
                            action: "REQUIRE_PAYMENT",
                            payload: {
                                orderId: order.id,
                                amount: workingContext.amount,
                                bookingData: {
                                    serviceId: workingContext.serviceId,
                                    providerId: workingContext.providerId,
                                    addressId: workingContext.addressId,
                                    scheduledDate: workingContext.date,
                                    scheduledTime: workingContext.time,
                                    customerName: workingContext.customerName,
                                    phone: workingContext.phone,
                                    instructions: workingContext.instructions,
                                    amount: workingContext.amount,
                                },
                            },
                        };
                        logger.info(`[Chatbot] Final response payload:`, JSON.stringify(response, null, 2));
                        await this._messageRepo.create({
                            sessionId: session._id,
                            role: "model",
                            text: response.text,
                        });
                        session.context = workingContext;
                        session.markModified("context");
                        await session.save();
                        logger.info("[Chatbot] Session saved.");
                        return response;
                    }
                    default:
                        logger.warn(`[Chatbot] Unknown tool: ${call.name}`);
                        toolResult = { error: "Unknown tool" };
                }
                logger.info(`[Chatbot] ✅ Tool Result:`, JSON.stringify(toolResult, null, 2));
                const result2 = await chat.sendMessage([{ functionResponse: { name: call.name, response: toolResult } }]);
                botResponseText = result2.response.text() || "Got it. What's next?";
                logger.info(`[Chatbot] 🤖 Final Response after tool: "${botResponseText}"`);
            }
            catch (err) {
                const errorMessage = err instanceof Error ? err.message : String(err);
                if (errorMessage.includes("429") || errorMessage.includes("quota")) {
                    botResponseText = "Exceeded request limit. Please try again later.";
                }
                else {
                    session.context = workingContext;
                    session.markModified("context");
                    await session.save();
                    botResponseText = "Sorry, something went wrong while processing your request.";
                    logger.error("[Chatbot] 💥 Error executing tool:", err);
                }
            }
            await this._messageRepo.create({
                sessionId: session._id,
                role: "model",
                text: botResponseText,
            });
            await session.save();
            return { role: "model", text: botResponseText, options: responseOptions };
        }
        const textResponse = response.text() || "Sorry, I'm not sure how to respond to that.";
        logger.info(`[Chatbot] 🤖 Simple Text Response: "${textResponse}"`);
        await this._messageRepo.create({
            sessionId: session._id,
            role: "model",
            text: textResponse,
        });
        return { role: "model", text: textResponse };
    }
    async verifyRazorpayPayment(sessionId, paymentData) {
        logger.info("the payment data", paymentData);
        const verified = verifyPaymentSignature(paymentData.razorpay_order_id, paymentData.razorpay_payment_id, paymentData.razorpay_signature);
        if (!verified)
            throw new CustomError("transaction is not legit", HttpStatusCode.BAD_REQUEST);
        const session = await this._sessionRepo.findOne({ sessionId });
        if (!session) {
            throw new CustomError("Session not found", HttpStatusCode.NOT_FOUND);
        }
        const { bookingData } = paymentData;
        const service = await this._serviceRepository.findById(bookingData.serviceId);
        if (!service)
            throw new CustomError("Service not found", HttpStatusCode.NOT_FOUND);
        const amount = Number(service.price);
        const subCategory = await this._categoryRepository.findById(service.subCategoryId.toString());
        const commissionRule = await this._commissionRuleRepository.findOne({
            categoryId: subCategory._id.toString(),
        });
        let totalCommission = await calculateCommission(amount, commissionRule);
        totalCommission += await this._calculateParentCommissionInternal(amount, subCategory);
        const provider = await this._providerRepository.findById(bookingData.providerId);
        if (provider?.subscription?.status === "ACTIVE" && provider.subscription.planId) {
            const plan = await this._subscriptionPlanRepository.findById(provider.subscription.planId.toString());
            totalCommission = applySubscriptionAdjustments(amount, totalCommission, plan, commissionRule);
        }
        const providerAmount = amount - totalCommission;
        const durationInMinutes = convertDurationToMinutes(service.duration);
        const booking = await this._bookingRepository.create({
            userId: session.userId,
            serviceId: new Types.ObjectId(bookingData.serviceId),
            providerId: new Types.ObjectId(bookingData.providerId),
            addressId: new Types.ObjectId(bookingData.addressId),
            paymentStatus: PaymentStatus.PAID,
            amount: String(amount),
            status: BookingStatus.PENDING,
            scheduledDate: bookingData.scheduledDate,
            scheduledTime: bookingData.scheduledTime,
            customerName: bookingData.customerName,
            phone: bookingData.phone,
            instructions: bookingData.instructions,
            createdBy: "Bot",
            duration: durationInMinutes,
        });
        const payment = await this._paymentRepository.create({
            userId: session.userId ? new Types.ObjectId(session.userId.toString()) : undefined,
            providerId: new Types.ObjectId(bookingData.providerId),
            bookingId: booking._id,
            paymentMethod: PaymentMethod.BANK,
            paymentDate: new Date(),
            amount: amount,
            adminCommission: totalCommission,
            providerAmount: providerAmount,
            razorpay_order_id: paymentData.razorpay_order_id,
            razorpay_payment_id: paymentData.razorpay_payment_id,
            razorpay_signature: paymentData.razorpay_signature,
        });
        booking.paymentId = payment._id;
        await booking.save();
        session.context = {
            userId: session.context.userId,
            role: session.context.role,
            customerName: session.context.customerName,
            phone: session.context.phone,
            lastBookingId: booking._id.toString(),
        };
        session.markModified("context");
        await session.save();
        const confirmationMsg = `
🎉 **Booking Confirmed!**

✅ Payment successful
📋 Booking ID: ${booking._id}
🛠️ Service: ${service.title}
👤 Provider: ${provider?.fullName}
🕐 Scheduled: ${bookingData.scheduledDate} at ${bookingData.scheduledTime}

Your provider will contact you shortly. Thank you for using QuickMate!
        `.trim();
        await this._messageRepo.create({
            sessionId: session._id,
            role: "model",
            text: confirmationMsg,
        });
        return booking;
    }
    async _calculateParentCommissionInternal(amount, subCategory) {
        if (!subCategory.parentId)
            return 0;
        const parentCategory = await this._categoryRepository.findById(subCategory.parentId.toString());
        if (!parentCategory)
            return 0;
        const parentCommission = await this._commissionRuleRepository.findOne({
            categoryId: parentCategory._id.toString(),
        });
        return calculateCommission(amount, parentCommission);
    }
};
ChatbotService = __decorate([
    injectable(),
    __param(0, inject(TYPES.CategoryService)),
    __param(1, inject(TYPES.ChatSessionRepository)),
    __param(2, inject(TYPES.ChatMessageRepository)),
    __param(3, inject(TYPES.ServiceRepository)),
    __param(4, inject(TYPES.CategoryRepository)),
    __param(5, inject(TYPES.AddressService)),
    __param(6, inject(TYPES.BookingService)),
    __param(7, inject(TYPES.ProviderRepository)),
    __param(8, inject(TYPES.ProviderService)),
    __param(9, inject(TYPES.UserRepository)),
    __param(10, inject(TYPES.PaymentService)),
    __param(11, inject(TYPES.PaymentRepository)),
    __param(12, inject(TYPES.BookingRepository)),
    __param(13, inject(TYPES.CommissionRuleRepository)),
    __param(14, inject(TYPES.SubscriptionPlanRepository)),
    __metadata("design:paramtypes", [Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object])
], ChatbotService);
export { ChatbotService };
