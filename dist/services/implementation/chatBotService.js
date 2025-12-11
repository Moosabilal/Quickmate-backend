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
const userRoles_1 = require("../../enums/userRoles");
const razorpay_1 = require("../../utils/razorpay");
const commissionRule_1 = require("../../utils/helperFunctions/commissionRule");
const subscription_1 = require("../../utils/helperFunctions/subscription");
const convertDurationToMinutes_1 = require("../../utils/helperFunctions/convertDurationToMinutes");
const booking_enum_1 = require("../../enums/booking.enum");
const logger_1 = __importDefault(require("../../logger/logger"));
const fuse_js_1 = __importDefault(require("fuse.js"));
const BOOKING_KEYWORDS = ['book', 'schedule', 'appointment', 'clean', 'repair', 'service', 'want'];
let ChatbotService = class ChatbotService {
    constructor(categoryService, sessionRepo, messageRepo, serviceRepository, categoryRepository, addressService, bookingService, providerRepository, providerService, userRepository, paymentService, paymentRepository, bookingRepository, commissionRuleRepository, subscriptionPlanRepository) {
        this.SYSTEM_PROMPT = `
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
        this.tools = [
            {
                name: "findSubcategoryByName",
                description: "Finds a specific service/subcategory by its name, e.g., 'kitchen cleaning'. This is the first step.",
                parameters: { type: generative_ai_1.SchemaType.OBJECT, properties: { serviceName: { type: generative_ai_1.SchemaType.STRING } }, required: ["serviceName"] }
            },
            {
                name: "listAllServices",
                description: "Lists all available services when the user asks a general question like 'what services do you have?' or 'show me all services'.",
                parameters: { type: generative_ai_1.SchemaType.OBJECT, properties: {} }
            },
            {
                name: "getUserAddresses",
                description: "Get list of user's saved addresses. Only works if the user is logged in.",
                parameters: { type: generative_ai_1.SchemaType.OBJECT, properties: {} }
            },
            {
                name: "getAvailableTimeSlots",
                description: "Gets all available 1-hour time slots for a service, location, radius, and date.",
                parameters: {
                    type: generative_ai_1.SchemaType.OBJECT,
                    properties: {
                        date: { type: generative_ai_1.SchemaType.STRING, description: "YYYY-MM-DD" },
                        radius: { type: generative_ai_1.SchemaType.NUMBER, description: "Search radius in km, e.g., 10" }
                    },
                    required: ["date", "radius"]
                }
            },
            {
                name: "findAvailableProvidersForSlot",
                description: "Finds providers who are available for a specific, chosen time slot.",
                parameters: { type: generative_ai_1.SchemaType.OBJECT, properties: { time: { type: generative_ai_1.SchemaType.STRING, description: "hh:mm AM/PM" } }, required: ["time"] }
            },
            {
                name: "initiatePayment",
                description: "The final step. Gathers all context and creates the payment order for the user.",
                parameters: { type: generative_ai_1.SchemaType.OBJECT, properties: { customerName: { type: generative_ai_1.SchemaType.STRING }, phone: { type: generative_ai_1.SchemaType.STRING }, instructions: { type: generative_ai_1.SchemaType.STRING } }, required: ["customerName", "phone"] }
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
        this._providerRepository = providerRepository;
        this._providerService = providerService;
        this._userRepository = userRepository;
        this._PaymentService = paymentService;
        this._paymentRepository = paymentRepository;
        this._bookingRepository = bookingRepository;
        this._commissionRuleRepository = commissionRuleRepository;
        this._subscriptionPlanRepository = subscriptionPlanRepository;
    }
    startSession(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            let userRole = userRoles_1.Roles.USER;
            if (userId && userId !== "undefined") {
                const user = yield this._userRepository.findById(userId);
                if (user) {
                    userRole = user.role;
                }
            }
            const sessionId = (0, nanoid_1.nanoid)(10);
            const newSession = yield this._sessionRepo.create({
                userId: (userId && userId !== "undefined") ? new mongoose_1.Types.ObjectId(userId) : undefined,
                sessionId: sessionId,
                context: {
                    userId: userId || null,
                    role: userRole
                }
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
            logger_1.default.info(`[Chatbot] 📨 New message for session ${sessionId}: "${userMessage}"`);
            let session = yield this._sessionRepo.findOne({ sessionId });
            if (!session) {
                throw new CustomError_1.CustomError("Chat session not found", HttpStatusCode_1.HttpStatusCode.NOT_FOUND);
            }
            if (!session.userId) {
                const lowerMsg = userMessage.toLowerCase();
                const hasBookingIntent = BOOKING_KEYWORDS.some(keyword => lowerMsg.includes(keyword));
                if (hasBookingIntent) {
                    yield this._messageRepo.create({ sessionId: session._id, role: "user", text: userMessage });
                    const loginMsg = "To help you book a service, I need you to log in first. Please log in to continue.";
                    yield this._messageRepo.create({ sessionId: session._id, role: "model", text: loginMsg });
                    return {
                        role: 'model',
                        text: loginMsg,
                        action: 'REQUIRE_LOGIN'
                    };
                }
            }
            let contextUpdated = false;
            if (!session.context.serviceSubCategoryId) {
                const category = yield this._categoryRepository.findSubCategoryByName(userMessage);
                if (category) {
                    logger_1.default.info(`[Chatbot] 📝 User confirmed service: ${category.name}`);
                    const newContext = Object.assign({}, session.context);
                    newContext.serviceSubCategoryId = category._id.toString();
                    session.context = newContext;
                    session.markModified("context");
                    yield session.save();
                    contextUpdated = true;
                }
            }
            if (session.context.tempAddressList && !session.context.addressId) {
                const match = userMessage.match(/\b(?:option|select|choose|pick)?\s*(\d+)\b/i);
                if (match) {
                    const index = parseInt(match[1]) - 1;
                    if (session.context.tempAddressList[index]) {
                        const selected = session.context.tempAddressList[index];
                        const newContext = Object.assign({}, session.context);
                        newContext.addressId = selected.id;
                        newContext.location = {
                            lat: selected.lat,
                            lng: selected.lng
                        };
                        delete newContext.tempAddressList;
                        session.context = newContext;
                        session.markModified("context");
                        yield session.save();
                        contextUpdated = true;
                    }
                }
            }
            if (session.context.lastFoundProviders && !session.context.providerId) {
                const match = userMessage.match(/\b(?:option|select|choose|pick)?\s*(\d+)\b/i);
                if (match) {
                    const index = parseInt(match[1]) - 1;
                    if (session.context.lastFoundProviders[index]) {
                        const selected = session.context.lastFoundProviders[index];
                        logger_1.default.info(`[Chatbot] 📍 User selected provider #${index + 1}: ${selected.name}`);
                        const newContext = Object.assign({}, session.context);
                        newContext.providerId = selected.providerId;
                        newContext.serviceId = selected.serviceId;
                        newContext.amount = selected.price;
                        session.context = newContext;
                        session.markModified('context');
                        yield session.save();
                        contextUpdated = true;
                    }
                }
            }
            let workingContext = JSON.parse(JSON.stringify(session.context));
            logger_1.default.info(`[Chatbot] Context (Start of Turn):`, JSON.stringify(workingContext, null, 2));
            yield this._messageRepo.create({ sessionId: session._id, role: "user", text: userMessage });
            const history = yield this._messageRepo.findAll({ sessionId: session._id });
            const chatHistory = history.map(msg => ({ role: msg.role, parts: [{ text: msg.text }] }));
            const model = this._genAI.getGenerativeModel({
                model: "gemini-2.5-flash",
                tools: [{ functionDeclarations: this.tools }]
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
            logger_1.default.info(`[Chatbot] 🚀 Sending to Gemini...`);
            const result = yield chat.sendMessage(contextPrompt);
            const response = result.response;
            const functionCalls = response.functionCalls();
            if (functionCalls && functionCalls.length > 0) {
                const call = functionCalls[0];
                logger_1.default.info(`[Chatbot] 🛠️ Gemini wants to call tool: ${call.name}`);
                logger_1.default.info(`[Chatbot] 📦 Tool Arguments:`, JSON.stringify(call.args, null, 2));
                let toolResult;
                let botResponseText = null;
                let responseOptions = undefined;
                const context = session.context || {};
                let currentContext = Object.assign({}, session.context);
                try {
                    switch (call.name) {
                        case "findSubcategoryByName": {
                            const { serviceName } = call.args;
                            const category = yield this._categoryRepository.findSubCategoryByName(serviceName);
                            if (category) {
                                logger_1.default.info(`[Chatbot] Exact match found for: ${serviceName}`);
                                session.context = {
                                    userId: session.context.userId,
                                    role: session.context.role,
                                    customerName: session.context.customerName,
                                    phone: session.context.phone,
                                    serviceSubCategoryId: category._id.toString(),
                                };
                                session.markModified('context');
                                yield session.save();
                                const suggestionOptions = [{ name: category.name }];
                                toolResult = { servicesFound: 1, possibleMatches: suggestionOptions.map(s => s.name) };
                                responseOptions = suggestionOptions;
                            }
                            else {
                                logger_1.default.warn(`[Chatbot] Exact match failed for: ${serviceName}. Trying fuzzy search...`);
                                const allSubCategories = yield this._categoryRepository.findAllActiveSubCategories();
                                const fuse = new fuse_js_1.default(allSubCategories, {
                                    keys: ['name'],
                                    includeScore: true,
                                    threshold: 0.4
                                });
                                const results = fuse.search(serviceName);
                                const suggestions = results.map(result => result.item);
                                if (suggestions.length > 0) {
                                    logger_1.default.info(`[Chatbot] Found suggestions:`, suggestions);
                                    const suggestionOptions = suggestions.slice(0, 5).map(s => ({ name: s.name }));
                                    toolResult = { servicesFound: suggestionOptions.length, possibleMatches: suggestionOptions.map(s => s.name) };
                                    responseOptions = suggestionOptions;
                                }
                                else {
                                    logger_1.default.warn(`[Chatbot] No relevant suggestions found for '${serviceName}'.`);
                                    toolResult = { error: `Sorry, I couldn't find any services matching '${serviceName}'. You can ask me to list all services to see what's available.` };
                                }
                            }
                            break;
                        }
                        case "listAllServices": {
                            logger_1.default.info(`[Chatbot] Tool: Listing all available services.`);
                            const allServices = yield this._categoryRepository.findAllActiveSubCategories();
                            const serviceOptions = allServices.map(s => ({ name: s.name }));
                            toolResult = { servicesFound: serviceOptions.length };
                            responseOptions = serviceOptions;
                            logger_1.default.info(`[Chatbot] Found ${serviceOptions.length} services to show.`);
                            break;
                        }
                        case "getUserAddresses": {
                            if (!session.userId) {
                                logger_1.default.info(`[Chatbot] ❌ User not logged in. Cannot fetch addresses.`);
                                toolResult = { addressesFound: 0, error: "User not logged in." };
                            }
                            else {
                                try {
                                    const addresses = yield this._addressService.getAddressesForUser(session.userId.toString());
                                    logger_1.default.info(`[Chatbot] ✓ Found ${addresses.length} addresses for user.`);
                                    const addressList = addresses.map((a, i) => {
                                        var _a, _b, _c, _d;
                                        const converted = {
                                            id: a._id.toString(),
                                            label: a.label,
                                            street: a.street,
                                            city: a.city,
                                            lat: (_b = (_a = a.locationCoords) === null || _a === void 0 ? void 0 : _a.coordinates) === null || _b === void 0 ? void 0 : _b[1],
                                            lng: (_d = (_c = a.locationCoords) === null || _c === void 0 ? void 0 : _c.coordinates) === null || _d === void 0 ? void 0 : _d[0],
                                            index: i + 1
                                        };
                                        return converted;
                                    });
                                    currentContext.tempAddressList = addressList;
                                    workingContext.tempAddressList = addressList;
                                    session.context = currentContext;
                                    session.markModified("context");
                                    yield session.save();
                                    toolResult = { addressesFound: addressList.length };
                                    responseOptions = addressList;
                                }
                                catch (err) {
                                    logger_1.default.error("[ERROR] Failed fetching addresses:", err);
                                    toolResult = { error: "Failed to fetch addresses." };
                                }
                            }
                            break;
                        }
                        case "getAvailableTimeSlots": {
                            const { date, radius } = call.args;
                            logger_1.default.info(`[Chatbot] Getting slots for date: ${date}, radius: ${radius}km`);
                            if (radius < 5 || radius > 25) {
                                logger_1.default.warn(`[Chatbot] ❗ Invalid radius: ${radius}km. Must be between 5 and 25.`);
                                toolResult = { error: `The search radius must be between 5km and 25km. Please provide a valid distance.` };
                                break;
                            }
                            const requestedDate = new Date(date);
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            if (isNaN(requestedDate.getTime()) || requestedDate < today) {
                                logger_1.default.warn(`[Chatbot] ❗ Invalid or past date provided: ${date}`);
                                toolResult = { error: `The date provided (${date}) is either in the past or not a valid date. Please provide a future date in YYYY-MM-DD format.` };
                                delete currentContext.date;
                                break;
                            }
                            currentContext.date = date;
                            currentContext.radius = radius;
                            session.context = currentContext;
                            session.markModified('context');
                            logger_1.default.info(`[Chatbot] Current Context the second one:`, JSON.stringify(currentContext, null, 2));
                            if (!currentContext.location && currentContext.tempAddressList) {
                                logger_1.default.warn(`[Chatbot] Missing location but temp address list exists. User likely selected by number.`);
                                toolResult = { error: "I don't have a location yet. Please ask the user to select an address first." };
                                break;
                            }
                            if (!currentContext.serviceSubCategoryId || !currentContext.location) {
                                logger_1.default.warn(`[Chatbot] Missing context. SubCat: ${currentContext.serviceSubCategoryId}, Loc: ${JSON.stringify(currentContext.location)}`);
                                toolResult = { error: "Missing service or address. You must ask for them first." };
                                yield session.save();
                                break;
                            }
                            let slots = yield this._providerService.getAvailabilityByLocation(((_a = session.userId) === null || _a === void 0 ? void 0 : _a.toString()) || "", currentContext.serviceSubCategoryId, currentContext.location.lat, currentContext.location.lng, radius, date, date);
                            if (session.context.role === userRoles_1.Roles.PROVIDER && session.userId) {
                                const currentProviderId = yield this._providerRepository.getProviderId(session.userId.toString());
                                if (currentProviderId) {
                                    logger_1.default.info(`[Chatbot] 🛡️ Provider user detected. Filtering out their own slots. Provider ID: ${currentProviderId}`);
                                    slots = slots.filter(p => p.providerId.toString() !== currentProviderId);
                                }
                            }
                            const allSlots = slots.flatMap(provider => provider.availableSlots.map(s => new Date(s.start).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })));
                            const uniqueSlots = [...new Set(allSlots)].sort();
                            logger_1.default.info(`[Chatbot] Found ${uniqueSlots.length} unique slots.`);
                            toolResult = { slotsFound: uniqueSlots.length };
                            responseOptions = uniqueSlots;
                            yield session.save();
                            break;
                        }
                        case "findAvailableProvidersForSlot": {
                            logger_1.default.info(`[Chatbot] Raw function call args:`, call.args);
                            const { time } = call.args;
                            logger_1.default.info(`[Chatbot] Extracted time: ${time}`);
                            workingContext.time = time;
                            session.context.time = time;
                            logger_1.default.info(`[Chatbot] Updated context.time = ${session.context.time}`);
                            logger_1.default.info(`[Chatbot] Current context before validation:`, JSON.stringify(context, null, 2));
                            if (!workingContext.serviceSubCategoryId || !workingContext.location || !workingContext.radius || !workingContext.date) {
                                toolResult = {
                                    error: "Missing context. You must get service, address, radius, and date first."
                                };
                                logger_1.default.info(`[Chatbot] Returning ERROR toolResult for missing context:`, toolResult);
                                break;
                            }
                            const nearbyProviders = yield this._providerService.findNearbyProviders([context.location.lng, context.location.lat], context.radius || 10, context.serviceSubCategoryId);
                            logger_1.default.info(`[Chatbot] Nearby provider raw result:`, nearbyProviders);
                            if (!nearbyProviders || nearbyProviders.length === 0) {
                                logger_1.default.info(`[Chatbot] ❗ No providers found nearby.`);
                                toolResult = { providers: [], message: "No providers found within that radius." };
                                break;
                            }
                            logger_1.default.info(`[Chatbot] Found ${nearbyProviders.length} providers in range.`);
                            const providersInRange = nearbyProviders.map((p) => p._id.toString());
                            logger_1.default.info(`[Chatbot] Provider IDs in range:`, providersInRange);
                            const services = yield this._serviceRepository.findServicesWithProvider(context.serviceSubCategoryId, undefined);
                            logger_1.default.info(`[Chatbot] Raw services fetched:`, services.length);
                            const servicesInRange = services.filter(s => providersInRange.includes((s).provider._id.toString()));
                            logger_1.default.info(`[Chatbot] Services matching providers in range: ${servicesInRange.length}`);
                            if (!servicesInRange.length) {
                                logger_1.default.info(`[Chatbot] ❗ Providers found, but none have matching service documents.`);
                                toolResult = { providers: [] };
                                break;
                            }
                            const providerIds = servicesInRange.map(s => (s).provider._id.toString());
                            logger_1.default.info(`[Chatbot] Checking availability for provider IDs:`, providerIds);
                            let availableProviders = yield this._providerService.findProvidersAvailableAtSlot(providerIds, context.date, time);
                            if (session.context.role === userRoles_1.Roles.PROVIDER && session.userId) {
                                const currentProviderId = yield this._providerRepository.getProviderId(session.userId.toString());
                                if (currentProviderId) {
                                    logger_1.default.info(`[Chatbot] 🛡️ Provider user detected. Filtering out their own provider profile. Provider ID: ${currentProviderId}`);
                                    availableProviders = availableProviders.filter(p => p._id.toString() !== currentProviderId);
                                }
                            }
                            logger_1.default.info(`[Chatbot] Available providers after time check:`, availableProviders);
                            const providerList = availableProviders.map(p => {
                                const service = servicesInRange.find(s => (s).provider._id.toString() === p._id.toString());
                                logger_1.default.info(`[Chatbot] Mapping provider ${p._id}:`, { service });
                                return {
                                    serviceId: service._id.toString(),
                                    providerId: p._id.toString(),
                                    name: p.fullName,
                                    rating: p.rating,
                                    price: service.price
                                };
                            });
                            logger_1.default.info(`[Chatbot] ✅ Final provider list:`, providerList);
                            if (providerList.length === 1) {
                                const selected = providerList[0];
                                logger_1.default.info(`[Chatbot] 📍 Auto-selecting the only available provider: ${selected.name}`);
                                workingContext.providerId = selected.providerId;
                                workingContext.serviceId = selected.serviceId;
                                workingContext.amount = selected.price;
                                delete workingContext.lastFoundProviders;
                                session.context = workingContext;
                                session.markModified('context');
                                yield session.save();
                                toolResult = { autoSelectedProvider: selected };
                                responseOptions = providerList;
                            }
                            else if (providerList.length > 1) {
                                workingContext.lastFoundProviders = providerList;
                                session.context.lastFoundProviders = providerList;
                                session.markModified("context");
                                yield session.save();
                                toolResult = { providersFound: providerList.length };
                                responseOptions = providerList;
                                logger_1.default.info(`[Chatbot] Returning toolResult:`, toolResult);
                            }
                            else {
                                toolResult = { providersFound: 0, message: "No providers were available for that specific time." };
                            }
                            break;
                        }
                        case "initiatePayment": {
                            const { customerName, phone, instructions } = call.args;
                            workingContext.customerName = customerName;
                            workingContext.phone = phone;
                            workingContext.instructions = instructions;
                            logger_1.default.info(`[Chatbot] Updated context after adding customer details:`, JSON.stringify(workingContext, null, 2));
                            if (!workingContext.providerId) {
                                const match = userMessage.match(/^\s*(\d+)\s*$/);
                                if (match && workingContext.lastFoundProviders) {
                                    const index = parseInt(match[1]) - 1;
                                    if (workingContext.lastFoundProviders[index]) {
                                        logger_1.default.info(`[Chatbot] User selected provider #${index + 1}`);
                                        workingContext.providerId = workingContext.lastFoundProviders[index].providerId;
                                        logger_1.default.info(`[Chatbot] Inferred provider selection: ${workingContext.providerId}`);
                                    }
                                }
                            }
                            const chosenProvider = (_b = (workingContext.lastFoundProviders)) === null || _b === void 0 ? void 0 : _b.find(p => p.providerId === workingContext.providerId);
                            if (!chosenProvider) {
                                logger_1.default.error(`[Chatbot] ❌ No matching provider found for providerId: ${context.providerId}`);
                            }
                            else {
                                logger_1.default.info(`[Chatbot] Found chosen provider:`, chosenProvider);
                                workingContext.serviceId = chosenProvider.serviceId;
                                workingContext.amount = chosenProvider.price;
                            }
                            yield session.save();
                            logger_1.default.info(`working context serviceId: ${workingContext}`);
                            if (!workingContext.serviceId || !workingContext.providerId || !workingContext.addressId || !workingContext.date || !workingContext.time || !workingContext.amount) {
                                logger_1.default.error(`[Chatbot] ❌ Missing critical booking info.`);
                                logger_1.default.error(`[Chatbot] Full Context:`, JSON.stringify(context, null, 2));
                                toolResult = {
                                    error: "Missing critical booking info. You must confirm all details with the user first."
                                };
                                logger_1.default.info(`[Chatbot] Returning error toolResult.`);
                                break;
                            }
                            const order = yield this._PaymentService.createOrder(workingContext.amount);
                            logger_1.default.info(` - orderId: ${order.id}`);
                            const response = {
                                role: 'model',
                                text: "Great! Please complete your payment to confirm the booking.",
                                action: 'REQUIRE_PAYMENT',
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
                                        amount: workingContext.amount
                                    }
                                }
                            };
                            logger_1.default.info(`[Chatbot] Final response payload:`, JSON.stringify(response, null, 2));
                            yield this._messageRepo.create({
                                sessionId: session._id,
                                role: "model",
                                text: response.text
                            });
                            session.context = workingContext;
                            session.markModified('context');
                            yield session.save();
                            logger_1.default.info("[Chatbot] Session saved.");
                            return response;
                        }
                        default:
                            logger_1.default.warn(`[Chatbot] Unknown tool: ${call.name}`);
                            toolResult = { error: "Unknown tool" };
                    }
                    logger_1.default.info(`[Chatbot] ✅ Tool Result:`, JSON.stringify(toolResult, null, 2));
                    const result2 = yield chat.sendMessage([{ functionResponse: { name: call.name, response: toolResult } }]);
                    botResponseText = result2.response.text() || "Got it. What's next?";
                    logger_1.default.info(`[Chatbot] 🤖 Final Response after tool: "${botResponseText}"`);
                }
                catch (err) {
                    session.context = workingContext;
                    session.markModified('context');
                    yield session.save();
                    botResponseText = "Sorry, something went wrong while processing your request.";
                    logger_1.default.error("[Chatbot] 💥 Error executing tool:", err);
                }
                yield this._messageRepo.create({ sessionId: session._id, role: "model", text: botResponseText });
                yield session.save();
                return { role: "model", text: botResponseText, options: responseOptions };
            }
            const textResponse = response.text() || "Sorry, I'm not sure how to respond to that.";
            logger_1.default.info(`[Chatbot] 🤖 Simple Text Response: "${textResponse}"`);
            yield this._messageRepo.create({ sessionId: session._id, role: "model", text: textResponse });
            return { role: "model", text: textResponse };
        });
    }
    verifyRazorpayPayment(sessionId, paymentData) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            logger_1.default.info('the payment data', paymentData);
            const verified = (0, razorpay_1.verifyPaymentSignature)(paymentData.razorpay_order_id, paymentData.razorpay_payment_id, paymentData.razorpay_signature);
            if (!verified)
                throw new CustomError_1.CustomError("transaction is not legit", HttpStatusCode_1.HttpStatusCode.BAD_REQUEST);
            const session = yield this._sessionRepo.findOne({ sessionId });
            if (!session) {
                throw new CustomError_1.CustomError("Session not found", HttpStatusCode_1.HttpStatusCode.NOT_FOUND);
            }
            const { bookingData } = paymentData;
            const service = yield this._serviceRepository.findById(bookingData.serviceId);
            if (!service)
                throw new CustomError_1.CustomError("Service not found", HttpStatusCode_1.HttpStatusCode.NOT_FOUND);
            const amount = Number(service.price);
            const subCategory = yield this._categoryRepository.findById(service.subCategoryId.toString());
            const commissionRule = yield this._commissionRuleRepository.findOne({ categoryId: subCategory._id.toString() });
            let totalCommission = yield (0, commissionRule_1.calculateCommission)(amount, commissionRule);
            totalCommission += yield (0, commissionRule_1.calculateParentCommission)(amount, subCategory, this._categoryRepository, this._commissionRuleRepository);
            const provider = yield this._providerRepository.findById(bookingData.providerId);
            if (((_a = provider === null || provider === void 0 ? void 0 : provider.subscription) === null || _a === void 0 ? void 0 : _a.status) === "ACTIVE" && provider.subscription.planId) {
                const plan = yield this._subscriptionPlanRepository.findById(provider.subscription.planId.toString());
                totalCommission = (0, subscription_1.applySubscriptionAdjustments)(amount, totalCommission, plan, commissionRule);
            }
            const providerAmount = amount - totalCommission;
            const durationInMinutes = (0, convertDurationToMinutes_1.convertDurationToMinutes)(service.duration);
            const booking = yield this._bookingRepository.create({
                userId: session.userId,
                serviceId: new mongoose_1.Types.ObjectId(bookingData.serviceId),
                providerId: new mongoose_1.Types.ObjectId(bookingData.providerId),
                addressId: new mongoose_1.Types.ObjectId(bookingData.addressId),
                paymentStatus: userRoles_1.PaymentStatus.PAID,
                amount: String(amount),
                status: booking_enum_1.BookingStatus.PENDING,
                scheduledDate: bookingData.scheduledDate,
                scheduledTime: bookingData.scheduledTime,
                customerName: bookingData.customerName,
                phone: bookingData.phone,
                instructions: bookingData.instructions,
                createdBy: "Bot",
                duration: durationInMinutes
            });
            const payment = yield this._paymentRepository.create({
                userId: session.userId ? new mongoose_1.Types.ObjectId(session.userId.toString()) : undefined,
                providerId: new mongoose_1.Types.ObjectId(bookingData.providerId),
                bookingId: booking._id,
                paymentMethod: userRoles_1.PaymentMethod.BANK,
                paymentDate: new Date(),
                amount: amount,
                adminCommission: totalCommission,
                providerAmount: providerAmount,
                razorpay_order_id: paymentData.razorpay_order_id,
                razorpay_payment_id: paymentData.razorpay_payment_id,
                razorpay_signature: paymentData.razorpay_signature
            });
            booking.paymentId = payment._id;
            yield booking.save();
            session.context = {
                userId: session.context.userId,
                role: session.context.role,
                customerName: session.context.customerName,
                phone: session.context.phone,
                lastBookingId: booking._id.toString()
            };
            session.markModified('context');
            yield session.save();
            const confirmationMsg = `
🎉 **Booking Confirmed!**

✅ Payment successful
📋 Booking ID: ${booking._id}
🛠️ Service: ${service.title}
👤 Provider: ${provider === null || provider === void 0 ? void 0 : provider.fullName}
🕐 Scheduled: ${bookingData.scheduledDate} at ${bookingData.scheduledTime}

Your provider will contact you shortly. Thank you for using QuickMate!
        `.trim();
            yield this._messageRepo.create({
                sessionId: session._id,
                role: "model",
                text: confirmationMsg
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
    __param(7, (0, inversify_1.inject)(type_1.default.ProviderRepository)),
    __param(8, (0, inversify_1.inject)(type_1.default.ProviderService)),
    __param(9, (0, inversify_1.inject)(type_1.default.UserRepository)),
    __param(10, (0, inversify_1.inject)(type_1.default.PaymentService)),
    __param(11, (0, inversify_1.inject)(type_1.default.PaymentRepository)),
    __param(12, (0, inversify_1.inject)(type_1.default.BookingRepository)),
    __param(13, (0, inversify_1.inject)(type_1.default.CommissionRuleRepository)),
    __param(14, (0, inversify_1.inject)(type_1.default.SubscriptionPlanRepository)),
    __metadata("design:paramtypes", [Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object])
], ChatbotService);
