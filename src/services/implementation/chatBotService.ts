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
import { IPaymentService } from "../interface/IPaymentService"; // Still needed for creating orders
import { IBookingRepository } from "../../repositories/interface/IBookingRepository"; // Still needed
import { IUserRepository } from "../../repositories/interface/IUserRepository";
import { IChatbotResponse } from "../../interface/chatBot";
import { IBookingRequest } from "../../interface/booking";
import { IAddressData } from "../../interface/address";
import { Roles } from "../../enums/userRoles";
import { convertTo24Hour } from "../../utils/helperFunctions/convertTo24hrs";

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
    private _userRepository: IUserRepository;
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
        @inject(TYPES.UserRepository) userRepository: IUserRepository,
        @inject(TYPES.PaymentService) paymentService: IPaymentService,
        @inject(TYPES.BookingRepository) bookingRepository: IBookingRepository
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
        this._userRepository = userRepository;
        this._PaymentService = paymentService;
        this._bookingRepository = bookingRepository;
    }

    // --- SYSTEM PROMPT (Updated) ---
    private SYSTEM_PROMPT = `
    You are QuickMate AI, a friendly and professional assistant. Your goal is to help users book a service.
    **CRITICAL RULE: HANDLING CHANGES**
    - If the user changes their mind (e.g., "Actually, I need a cleaner" instead of a plumber), you MUST restart at Step 1.
    - Call 'findSubcategoryByName' for the NEW service immediately.
    - Ignore the previous service ID in your context.
    **CRITICAL RULE: HANDLING SEARCH FAILURES**
    - If the 'findSubcategoryByName' tool returns an error with "possibleMatches", you MUST present those options to the user.
    - Example: "I couldn't find 'X', but did you mean 'Y' or 'Z'?"
    CRITICAL RULE: You MUST follow these steps in order. Ask for only ONE piece of information at a time.
    CRITICAL RULE: You MUST save important details (serviceId, providerId, addressId, date, time) to the session.context as you learn them.

    **Step 1: Greet & Find Service**
    - User: "I need a kitchen cleaner"
    - You: (Call 'findSubcategoryByName' with 'serviceName: "kitchen cleaner"'. This finds the Subcategory ID.)
    - (The tool returns the serviceName. Save 'serviceId' and 'subCategoryId' to context.)
    - You: "I can help with that. To find providers, I need your address."

    **Step 2: Get Address**
    - (Call 'getUserAddresses'.)
    - If empty or user is a guest: Ask for 5 pieces of info ONE BY ONE: "What's a label for this address (e.g., Home)?" -> "What's the street?" -> "What's the city?" -> "What's the state?" -> "What's the zip code?". Then call 'createAddress'.
    - If addresses exist: "I found your saved addresses: 1. Home (123 Main St). Which one?"
    - (User replies with a number or name. You must identify which address they mean from the list you just got.)
    - (Once you identify the address, save its 'id' as 'addressId' and its 'coordinates' as 'location' {lat, lng} to context.)

    **Step 3: Get Radius & Date**
    - You: "Great. How far are you willing to search for a provider? (e.g., 10km, 25km)"
    - (User gives radius. Save 'radius' to context.)
    - You: "What date would you like this service? (e.g., tomorrow, or YYYY-MM-DD)"
    - (User gives date. Save 'date' to context.)

    **Step 4: Get Slots**
    - (You now have: subCategoryId, location, radius, and date. Call 'getAvailableTimeSlots'.)
    - (The tool returns a list of slots, e.g., ["09:00 AM", "10:00 AM", "02:00 PM"].)
    - You: "I found several open slots on that day: 9:00 AM, 10:00 AM, 2:00 PM. Which one works for you?"
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
    - You: "Okay! Just to confirm: You want [Service Name] with [Provider Name] on [Date] at [Time], at [Address]. The total is [Amount]. Is this all correct?"

    **Step 7: Payment**
    - User: "Yes, that's correct."
    - You: (Call 'initiatePayment' with the 'customerName' and 'phone'.)
    - (Your final response to the user will be: "Please complete your payment to confirm the booking.")
    `;


    // --- TOOL DEFINITIONS ---
    private tools: FunctionDeclaration[] = [
        {
            name: "findSubcategoryByName",
            description: "Finds a specific service/subcategory by its name, e.g., 'kitchen cleaning'. This is the first step.",
            parameters: { type: SchemaType.OBJECT, properties: { serviceName: { type: SchemaType.STRING } }, required: ["serviceName"] }
        },
        {
            name: "getUserAddresses",
            description: "Get list of user's saved addresses. Only works if the user is logged in.",
            parameters: { type: SchemaType.OBJECT, properties: {} }
        },
        {
            name: "createAddress",
            description: "Creates a new address for a logged-in user. Requires all parts.",
            parameters: {
                type: SchemaType.OBJECT,
                properties: {
                    label: { type: SchemaType.STRING }, street: { type: SchemaType.STRING },
                    city: { type: SchemaType.STRING }, state: { type: SchemaType.STRING }, zip: { type: SchemaType.STRING }
                },
                required: ["label", "street", "city", "state", "zip"]
            }
        },
        {
            name: "getAvailableTimeSlots",
            description: "Gets all available 1-hour time slots for a service, location, radius, and date.",
            parameters: {
                type: SchemaType.OBJECT,
                properties: {
                    date: { type: SchemaType.STRING, description: "YYYY-MM-DD" },
                    radius: { type: SchemaType.NUMBER, description: "Search radius in km, e.g., 10" }
                },
                required: ["date", "radius"]
            }
        },
        {
            name: "findAvailableProvidersForSlot",
            description: "Finds providers who are available for a specific, chosen time slot.",
            parameters: { type: SchemaType.OBJECT, properties: { time: { type: SchemaType.STRING, description: "hh:mm AM/PM" } }, required: ["time"] }
        },
        {
            name: "initiatePayment",
            description: "The final step. Gathers all context and creates the payment order for the user.",
            parameters: { type: SchemaType.OBJECT, properties: { customerName: { type: SchemaType.STRING }, phone: { type: SchemaType.STRING }, instructions: { type: SchemaType.STRING } }, required: ["customerName", "phone"] }
        }
    ];

    public async startSession(userId?: string): Promise<IChatSession> {
        let userRole = Roles.USER;
        if (userId && userId !== "undefined") {
            const user = await this._userRepository.findById(userId);
            if (user) {
                userRole = user.role as Roles;
            }
        }

        const sessionId = nanoid(10);
        const newSession = await this._sessionRepo.create({
            userId: (userId && userId !== "undefined") ? new Types.ObjectId(userId) : undefined,
            sessionId: sessionId,
            context: {
                userId: userId || null,
                role: userRole
            }
        });
        return newSession;
    }

    public async getHistory(sessionId: string): Promise<IChatMessage[]> {
        const session = await this._sessionRepo.findOne({ sessionId });
        if (!session) return [];
        return this._messageRepo.findAll({ sessionId: session._id });
    }

    // public async sendMessage(sessionId: string, userMessage: string): Promise<IChatbotResponse> {
    //     const session = await this._sessionRepo.findOne({ sessionId });
    //     if (!session) throw new CustomError("Chat session not found", HttpStatusCode.NOT_FOUND);

    //     await this._messageRepo.create({ sessionId: session._id, role: "user", text: userMessage });

    //     const history = await this._messageRepo.findAll({ sessionId: session._id });
    //     const chatHistory = history.map(msg => ({ role: msg.role as 'user' | 'model', parts: [{ text: msg.text as string }] }));

    //     const model = this._genAI.getGenerativeModel({
    //         model: "gemini-2.5-flash",
    //         tools: [{ functionDeclarations: this.tools }]
    //     });

    //     const chat = model.startChat({ history: chatHistory });

    //     // --- NOTE: We explicitly remind the AI of its context ---
    //     const contextPrompt = `
    //         SYSTEM_PROMPT: ${this.SYSTEM_PROMPT} 
    //         CURRENT_CONTEXT: ${JSON.stringify(session.context)}
    //         USER_MESSAGE: ${userMessage}
    //     `;

    //     const result = await chat.sendMessage(contextPrompt);
    //     const response = result.response;
    //     const functionCalls = response.functionCalls();

    //     if (functionCalls && functionCalls.length > 0) {
    //         const call = functionCalls[0];
    //         let toolResult: any;
    //         let botResponseText: string | null = null;

    //         const context: any = session.context || {};

    //         try {
    //             switch (call.name) {
    //                 case "findSubcategoryByName": {
    //                     const { serviceName } = call.args as { serviceName: string };
    //                     const category = await this._categoryRepository.findSubCategoryByName(serviceName);
    //                     if (!category) {
    //                         toolResult = { error: `The service '${serviceName}' does not exist.` };
    //                     } else {
    //                         session.context.serviceSubCategoryId = category._id.toString();
    //                         await session.save();
    //                         toolResult = { success: true, serviceName: category.name };
    //                     }
    //                     break;
    //                 }

    //                 case "getUserAddresses": {
    //                     if (!session.userId) {
    //                         toolResult = { error: "User not logged in. You must ask them for their full address." };
    //                     } else {
    //                         const addresses = await this._addressService.getAddressesForUser(session.userId.toString());
    //                         // --- CRITICAL: We send the full address list so the AI can parse the user's selection ---
    //                         const addressList = addresses.map((a, i) => ({ 
    //                             id: a._id.toString(), 
    //                             label: a.label, 
    //                             street: a.street, 
    //                             city: a.city, 
    //                             lat: a.locationCoords.coordinates[1], 
    //                             lng: a.locationCoords.coordinates[0],
    //                             index: i + 1 // Give the AI a number to reference
    //                         }));

    //                         // Store this list in context so we can reference it later if the user says "number 1"
    //                         session.context.tempAddressList = addressList;
    //                         await session.save();

    //                         toolResult = { addresses: addressList };
    //                     }
    //                     break;
    //                 }

    //                 case "createAddress": {
    //                     if (!session.userId) {
    //                         toolResult = { error: "User is not logged in. Cannot save a new address." };
    //                     } else {
    //                         const addressData: IAddressData = call.args as any;
    //                         try {
    //                             const newAddress = await this._addressService.createAddress(addressData, session.userId.toString());
    //                             session.context.addressId = newAddress._id.toString();
    //                             session.context.location = { lat: newAddress.locationCoords.coordinates[1], lng: newAddress.locationCoords.coordinates[0] };
    //                             await session.save();
    //                             toolResult = { newAddress: { id: newAddress._id, label: newAddress.label } };
    //                         } catch (geoError: any) {
    //                             toolResult = { error: "I couldn't find that address. Can you please provide a valid street, city, state, and zip code?" };
    //                         }
    //                     }
    //                     break;
    //                 }

    //                 case "getAvailableTimeSlots": {
    //                     const { date, radius } = call.args as { date: string, radius: number };
    //                     session.context.date = date; 
    //                     session.context.radius = radius; 

    //                     // --- LOGIC TO CHECK IF USER SELECTED AN ADDRESS ---
    //                     // If the user just said "Use address 1", the AI might not have called a tool to 'select' it.
    //                     // But since we saved the list in context, we can check if we have location data.
    //                     if (!context.location && context.tempAddressList) {
    //                          // If the user picked an address but we don't have location yet, 
    //                          // it means the AI skipped a step or inferred it. 
    //                          // Ideally, the AI should have called a tool to 'select' it, but we can infer it here if needed
    //                          // OR, better yet, we rely on the AI's memory. 
    //                          // If the AI calls this tool, it implies it *knows* the location.
    //                          // If context.location is missing, we return an error telling the AI to ask for address again.
    //                          toolResult = { error: "I don't have a location yet. Please ask the user to select an address first." };
    //                          break;
    //                     }

    //                     if (!context.serviceSubCategoryId || !context.location) {
    //                         toolResult = { error: "Missing service or address. You must ask for them first." };
    //                         break;
    //                     }

    //                     const slots = await this._providerService.getAvailabilityByLocation(
    //                         session.userId?.toString() || "",
    //                         context.serviceSubCategoryId,
    //                         context.location.lat,
    //                         context.location.lng,
    //                         radius,
    //                         date, 
    //                         date
    //                     );

    //                     const allSlots = slots.flatMap(provider => provider.availableSlots.map(s => new Date(s.start).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })));
    //                     const uniqueSlots = [...new Set(allSlots)].sort();

    //                     toolResult = { availableSlots: uniqueSlots };
    //                     break;
    //                 }

    //                 case "findAvailableProvidersForSlot": {
    //                     const { time } = call.args as { time: string };
    //                     session.context.time = time;

    //                     if (!context.serviceSubCategoryId || !context.location || !context.radius || !context.date) {
    //                         toolResult = { error: "Missing context. You must get service, address, radius, and date first." };
    //                         break;
    //                     }

    //                     // Find providers in range
    //                     const nearbyProviders = await this._providerService.findNearbyProviders(
    //                         [context.location.lng, context.location.lat], 
    //                         context.radius || 10,
    //                         context.serviceSubCategoryId
    //                     );

    //                     if (!nearbyProviders || nearbyProviders.length === 0) {
    //                         toolResult = { providers: [], message: "No providers found within that radius." };
    //                         break;
    //                     }

    //                     // 2. Create an array of ID strings
    //                     const providersInRange = nearbyProviders.map((p: any) => p._id.toString());

    //                     // 3. Find services (This part remains the same)
    //                     const services = await this._serviceRepository.findServicesWithProvider(context.serviceSubCategoryId, undefined);

    //                     // 4. Filter services using the array we just created
    //                     // Now .includes() will work because providersInRange is string[]
    //                     const servicesInRange = services.filter(s => providersInRange.includes((s as any).provider._id.toString()));

    //                     if (!servicesInRange.length) {
    //                          toolResult = { providers: [] };
    //                          break;
    //                     }

    //                     // 5. Check slots (This part remains the same)
    //                     const providerIds = servicesInRange.map(s => (s as any).provider._id.toString());
    //                     const availableProviders = await this._providerService.findProvidersAvailableAtSlot(
    //                         providerIds,
    //                         context.date,
    //                         time
    //                     );

    //                     const providerList = availableProviders.map(p => {
    //                         const service = servicesInRange.find(s => (s as any).provider._id.toString() === p._id.toString());
    //                         return {
    //                             serviceId: service._id.toString(),
    //                             providerId: p._id.toString(),
    //                             name: p.fullName,
    //                             rating: p.rating,
    //                             price: service.price
    //                         };
    //                     });

    //                     session.context.lastFoundProviders = providerList; 
    //                     await session.save();
    //                     toolResult = { providers: providerList };
    //                     break;
    //                 }

    //                 case "initiatePayment": {
    //                     const { customerName, phone, instructions } = call.args as any;
    //                     session.context.customerName = customerName;
    //                     session.context.phone = phone;
    //                     session.context.instructions = instructions;

    //                     const chosenProvider = (context.lastFoundProviders as any[]).find(p => p.providerId === context.providerId);
    //                     if(chosenProvider) {
    //                         session.context.serviceId = chosenProvider.serviceId;
    //                         session.context.amount = chosenProvider.price;
    //                     }
    //                     await session.save();

    //                     if (!context.serviceId || !context.providerId || !context.addressId || !context.date || !context.time || !context.amount) {
    //                          toolResult = { error: "Missing critical booking info. You must confirm all details with the user first." };
    //                          break;
    //                     }

    //                     const order = await this._PaymentService.createOrder(context.amount);

    //                     const response: IChatbotResponse = {
    //                         role: 'model',
    //                         text: "Great! Please complete your payment to confirm the booking.",
    //                         action: 'REQUIRE_PAYMENT',
    //                         payload: {
    //                             orderId: order.id,
    //                             amount: context.amount,
    //                             bookingData: {
    //                                 serviceId: context.serviceId,
    //                                 providerId: context.providerId,
    //                                 addressId: context.addressId,
    //                                 scheduledDate: context.date,
    //                                 scheduledTime: context.time,
    //                                 customerName: context.customerName,
    //                                 phone: context.phone,
    //                                 instructions: context.instructions,
    //                                 amount: context.amount // Ensure amount is passed
    //                             }
    //                         }
    //                     };

    //                     await this._messageRepo.create({ sessionId: session._id, role: "model", text: response.text });
    //                     await session.save();
    //                     return response;
    //                 }

    //                 default:
    //                     toolResult = { error: "Unknown tool" };
    //             }

    //             const result2 = await chat.sendMessage([{ functionResponse: { name: call.name, response: toolResult } }]);
    //             botResponseText = result2.response.text() || "Got it. What's next?";

    //             // --- CRITICAL: The AI needs to know that it successfully "selected" an address ---
    //             // If the AI's response text indicates it understood the address choice (e.g., "Okay, using Home"),
    //             // we need to make sure the 'context' reflects that. 
    //             // However, since we can't parse the AI's text easily, we rely on the System Prompt
    //             // to force the AI to use 'getAvailableTimeSlots' NEXT, which will fail if address is missing,
    //             // prompting the AI to ask again or use the list.

    //         } catch (err: any) {
    //             botResponseText = "Sorry, something went wrong while processing your request.";
    //             console.error("[ChatbotService Error]", err);
    //         }

    //         await this._messageRepo.create({ sessionId: session._id, role: "model", text: botResponseText });
    //         await session.save();
    //         return { role: "model", text: botResponseText };
    //     }

    //     const textResponse = response.text() || "Sorry, I'm not sure how to respond to that.";
    //     await this._messageRepo.create({ sessionId: session._id, role: "model", text: textResponse });

    //     // --- CHECK FOR ADDRESS SELECTION IN TEXT ---
    //     // If the user replied with a number, we need to check if they are selecting an address
    //     if (session.context.tempAddressList && !session.context.addressId) {
    //         const match = userMessage.match(/\b(\d+)\b/);
    //         if (match) {
    //             const index = parseInt(match[1]) - 1;
    //             if (session.context.tempAddressList[index]) {
    //                 const selected = session.context.tempAddressList[index];
    //                 session.context.addressId = selected.id;
    //                 session.context.location = { lat: selected.lat, lng: selected.lng };
    //                 delete session.context.tempAddressList; // Clear the temp list
    //                 await session.save();
    //             }
    //         }
    //     }

    //     return { role: "model", text: textResponse };
    // }


    public async sendMessage(sessionId: string, userMessage: string): Promise<IChatbotResponse> {
        console.log(`[Chatbot] 📨 New message for session ${sessionId}: "${userMessage}"`);

        let session = await this._sessionRepo.findOne({ sessionId });
        if (!session) {
            console.error(`[Chatbot] ❌ Session not found: ${sessionId}`);
            throw new CustomError("Chat session not found", HttpStatusCode.NOT_FOUND);
        }



        let contextUpdated = false;


        // Check tempAddressList and no addressId
        if (session.context.tempAddressList && !session.context.addressId) {

            const match = userMessage.match(/\b(?:option|select|choose|pick)?\s*(\d+)\b/i);

            if (match) {
                const index = parseInt(match[1]) - 1;

                if (session.context.tempAddressList[index]) {
                    console.log(`[Chatbot] 📍 User selected address #${index + 1}`);

                    const selected = session.context.tempAddressList[index];

                    const newContext = { ...session.context };

                    newContext.addressId = selected.id;

                    newContext.location = {
                        lat: selected.lat,
                        lng: selected.lng
                    };

                    delete newContext.tempAddressList;


                    session.context = newContext;
                    session.markModified("context");

                    await session.save();

                    contextUpdated = true;
                }
            }
        }

        console.log('lastFound Providers', session.context.lastFoundProviders)
        console.log('providerId', session.context.providerId)

        if (session.context.lastFoundProviders && !session.context.providerId) {
            const match = userMessage.match(/\b(?:option|select|choose|pick)?\s*(\d+)\b/i);
            console.log('match', match)
            if (match) {
                const index = parseInt(match[1]) - 1;
                if (session.context.lastFoundProviders[index]) {
                    console.log(`[Chatbot] 📍 User selected provider #${index + 1}`);
                    session.context.providerId = session.context.lastFoundProviders[index].providerId;
                    session.context = session.context;
                    delete session.context.lastFoundProviders;
                    session.markModified('context');
                    await session.save();
                    console.log('saved in the session context')
                    contextUpdated = true;

                }
            }
        }



        let workingContext = JSON.parse(JSON.stringify(session.context));
        console.log(`[Chatbot] Context (Start of Turn):`, JSON.stringify(workingContext, null, 2));

        await this._messageRepo.create({ sessionId: session._id, role: "user", text: userMessage });

        const history = await this._messageRepo.findAll({ sessionId: session._id });
        const chatHistory = history.map(msg => ({ role: msg.role as 'user' | 'model', parts: [{ text: msg.text as string }] }));

        const model = this._genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            tools: [{ functionDeclarations: this.tools }]
        });

        const chat = model.startChat({ history: chatHistory });

        const context = session.context as any;
        let progressReport = "CURRENT PROGRESS:\n";

        if (context.serviceSubCategoryId) {
            progressReport += "✅ Step 1 (Service): COMPLETE. Service ID found.\n";
        } else {
            progressReport += "❌ Step 1 (Service): PENDING. You need to find the service name.\n";
        }

        if (context.addressId && context.location) {
            progressReport += "✅ Step 2 (Address): COMPLETE. Address selected.\n";
        } else {
            progressReport += "❌ Step 2 (Address): PENDING. You need to get the user's address.\n";
        }

        if (context.radius && context.date) {
            progressReport += `✅ Step 3 (Radius/Date): COMPLETE. Radius: ${context.radius}, Date: ${context.date}.\n`;
        } else {
            progressReport += "❌ Step 3 (Radius/Date): PENDING. You need radius and date.\n";
        }

        if (context.time) {
            progressReport += `✅ Step 4 (Time): COMPLETE. Time selected: ${context.time}.\n`;
        } else {
            progressReport += "❌ Step 4 (Time): PENDING. Call 'getAvailableTimeSlots' using the date and radius.\n";
        }

        if (context.providerId) {
            progressReport += "✅ Step 5 (Provider): COMPLETE. Provider selected.\n";
        } else {
            progressReport += "❌ Step 5 (Provider): PENDING. After time is picked, call 'findAvailableProvidersForSlot'.\n";
        }

        const contextPrompt = `
            SYSTEM_PROMPT: ${this.SYSTEM_PROMPT} 
            
            ${progressReport}
            
            CURRENT_CONTEXT: ${JSON.stringify(session.context)}
            
            USER_MESSAGE: ${userMessage}
        `;

        console.log(`[Chatbot] 🚀 Sending to Gemini...`);
        const result = await chat.sendMessage(contextPrompt);
        const response = result.response;
        const functionCalls = response.functionCalls();

        if (functionCalls && functionCalls.length > 0) {
            const call = functionCalls[0];
            console.log(`[Chatbot] 🛠️ Gemini wants to call tool: ${call.name}`);
            console.log(`[Chatbot] 📦 Tool Arguments:`, JSON.stringify(call.args, null, 2));

            let toolResult: any;
            let botResponseText: string | null = null;

            console.log('the session context before updating', session.context)

            const context: any = session.context || {};

            let currentContext = { ...session.context };

            try {
                switch (call.name) {
                    case "findSubcategoryByName": {
                        const { serviceName } = call.args as { serviceName: string };

                        const category = await this._categoryRepository.findSubCategoryByName(serviceName);

                        if (category) {
                            console.log(`[Chatbot] Tool found category: ${category.name} (${category._id})`);

                            session.context = {
                                userId: session.context.userId,
                                role: session.context.role,
                                customerName: session.context.customerName,
                                phone: session.context.phone,

                                addressId: session.context.addressId,
                                location: session.context.location,
                                tempAddressList: session.context.tempAddressList,

                                serviceSubCategoryId: category._id.toString(),

                            };

                            session.markModified('context');
                            await session.save();

                            toolResult = { success: true, serviceName: category.name };
                        } else {
                            console.warn(`[Chatbot] Exact match failed for: ${serviceName}. Trying fuzzy search...`);

                            const allSubCategories = await this._categoryRepository.findAllActiveSubCategories();

                            const searchTerms = serviceName.toLowerCase().split(' ').filter(word => word.length > 2);

                            const suggestions = allSubCategories.filter(sub => {
                                const subName = sub.name.toLowerCase();
                                return searchTerms.some(term => subName.includes(term));
                            }).map(s => s.name);

                            if (suggestions.length > 0) {
                                console.log(`[Chatbot] Found suggestions:`, suggestions);
                                toolResult = {
                                    error: `Service '${serviceName}' not found directly.`,
                                    possibleMatches: suggestions.slice(0, 5)
                                };
                            } else {
                                const examples = allSubCategories.slice(0, 3).map(s => s.name);
                                toolResult = {
                                    error: `Service '${serviceName}' not found.`,
                                    availableExamples: examples
                                };
                            }
                        }
                        break;
                    }

                    case "getUserAddresses": {
                        if (!session.userId) {
                            console.log(`[Chatbot] ❌ User not logged in. Cannot fetch addresses.`);
                            toolResult = { error: "User not logged in. You must ask them for their full address." };

                        } else {
                            try {
                                const addresses = await this._addressService.getAddressesForUser(session.userId.toString());

                                console.log(`[Chatbot] ✓ Found ${addresses.length} addresses for user.`);
                                const addressList = addresses.map((a, i) => {
                                    const converted = {
                                        id: a._id.toString(),
                                        label: a.label,
                                        street: a.street,
                                        city: a.city,
                                        lat: a.locationCoords?.coordinates?.[1],
                                        lng: a.locationCoords?.coordinates?.[0],
                                        index: i + 1
                                    };

                                    return converted;
                                });


                                currentContext.tempAddressList = addressList;


                                session.context = currentContext;

                                session.markModified("context");

                                await session.save();

                                toolResult = { addresses: addressList };

                            } catch (err) {
                                console.log("[ERROR] Failed fetching addresses:", err);
                                toolResult = { error: "Failed to fetch addresses." };
                            }
                        }

                        break;
                    }

                    case "createAddress": {
                        const addressData: IAddressData = call.args as any;
                        console.log(`[Chatbot] Creating new address:`, addressData);

                        if (!session.userId) {
                            toolResult = { error: "User is not logged in. Cannot save a new address." };
                        } else {
                            try {
                                const newAddress = await this._addressService.createAddress(addressData, session.userId.toString());
                                console.log(`[Chatbot] Address created: ${newAddress._id}`);

                                session.context.addressId = newAddress._id.toString();
                                session.context.location = { lat: newAddress.locationCoords.coordinates[1], lng: newAddress.locationCoords.coordinates[0] };
                                await session.save();
                                toolResult = { newAddress: { id: newAddress._id, label: newAddress.label } };
                            } catch (geoError: any) {
                                console.error(`[Chatbot] Address creation failed:`, geoError);
                                toolResult = { error: "I couldn't find that address. Can you please provide a valid street, city, state, and zip code?" };
                            }
                        }
                        break;
                    }

                    case "getAvailableTimeSlots": {
                        const { date, radius } = call.args as { date: string, radius: number };
                        console.log(`[Chatbot] Getting slots for date: ${date}, radius: ${radius}km`);

                        currentContext.date = date;
                        currentContext.radius = radius;
                        session.context = currentContext;
                        session.markModified('context');

                        console.log(`[Chatbot] Current Context the second one:`, JSON.stringify(currentContext, null, 2))
                        if (!currentContext.location && currentContext.tempAddressList) {
                            console.warn(`[Chatbot] Missing location but temp address list exists. User likely selected by number.`);
                            toolResult = { error: "I don't have a location yet. Please ask the user to select an address first." };
                            break;
                        }

                        if (!context.serviceSubCategoryId || !context.location) {
                            console.warn(`[Chatbot] Missing context. SubCat: ${currentContext.serviceSubCategoryId}, Loc: ${JSON.stringify(currentContext.location)}`);
                            toolResult = { error: "Missing service or address. You must ask for them first." };
                            await session.save();
                            break;
                        }

                        const slots = await this._providerService.getAvailabilityByLocation(
                            session.userId?.toString() || "",
                            currentContext.serviceSubCategoryId,
                            currentContext.location.lat,
                            currentContext.location.lng,
                            radius,
                            date,
                            date
                        );

                        const allSlots = slots.flatMap(provider => provider.availableSlots.map(s => new Date(s.start).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })));
                        const uniqueSlots = [...new Set(allSlots)].sort();

                        console.log(`[Chatbot] Found ${uniqueSlots.length} unique slots.`);
                        toolResult = { availableSlots: uniqueSlots };
                        await session.save();
                        break;
                    }

                    case "findAvailableProvidersForSlot": {

                        console.log(`[Chatbot] Raw function call args:`, call.args);

                        const { time } = call.args as { time: string };
                        console.log(`[Chatbot] Extracted time: ${time}`);

                        workingContext.time = time;
                        session.context.time = time;
                        console.log(`[Chatbot] Updated context.time = ${session.context.time}`);

                        console.log(`[Chatbot] Current context before validation:`, JSON.stringify(context, null, 2));

                        // --- VALIDATION ---
                        if (!workingContext.serviceSubCategoryId || !workingContext.location || !workingContext.radius || !workingContext.date) {
                            console.warn(`[Chatbot] ❗ Missing required context fields.`);
                            console.warn(`[Chatbot] serviceSubCategoryId:`, context.serviceSubCategoryId);
                            console.warn(`[Chatbot] location:`, context.location);
                            console.warn(`[Chatbot] radius:`, context.radius);
                            console.warn(`[Chatbot] date:`, context.date);

                            toolResult = {
                                error: "Missing context. You must get service, address, radius, and date first."
                            };
                            console.log(`[Chatbot] Returning ERROR toolResult for missing context:`, toolResult);
                            break;
                        }

                        console.log(`[Chatbot] Context validation success. Proceeding to provider search...`);

                        // --- FIND NEARBY PROVIDERS ---
                        console.log(`[Chatbot] Searching nearby providers with:`);
                        console.log(` - Location (lng, lat): [${context.location.lng}, ${context.location.lat}]`);
                        console.log(` - Radius: ${context.radius}`);
                        console.log(` - Subcategory: ${context.serviceSubCategoryId}`);

                        const nearbyProviders = await this._providerService.findNearbyProviders(
                            [context.location.lng, context.location.lat],
                            context.radius || 10,
                            context.serviceSubCategoryId
                        );

                        console.log(`[Chatbot] Nearby provider raw result:`, nearbyProviders);

                        if (!nearbyProviders || nearbyProviders.length === 0) {
                            console.log(`[Chatbot] ❗ No providers found nearby.`);
                            toolResult = { providers: [], message: "No providers found within that radius." };
                            break;
                        }

                        console.log(`[Chatbot] Found ${nearbyProviders.length} providers in range.`);

                        // --- FILTER SERVICES ---
                        const providersInRange = nearbyProviders.map((p: any) => p._id.toString());
                        console.log(`[Chatbot] Provider IDs in range:`, providersInRange);

                        const services = await this._serviceRepository.findServicesWithProvider(
                            context.serviceSubCategoryId,
                            undefined
                        );

                        console.log(`[Chatbot] Raw services fetched:`, services.length);

                        const servicesInRange = services.filter(s =>
                            providersInRange.includes((s as any).provider._id.toString())
                        );

                        console.log(`[Chatbot] Services matching providers in range: ${servicesInRange.length}`);

                        if (!servicesInRange.length) {
                            console.log(`[Chatbot] ❗ Providers found, but none have matching service documents.`);
                            toolResult = { providers: [] };
                            break;
                        }

                        // --- CHECK TIME AVAILABILITY ---
                        const providerIds = servicesInRange.map(s => (s as any).provider._id.toString());
                        console.log(`[Chatbot] Checking availability for provider IDs:`, providerIds);

                        const availableProviders = await this._providerService.findProvidersAvailableAtSlot(
                            providerIds,
                            context.date,
                            time
                        );

                        console.log(`[Chatbot] Available providers after time check:`, availableProviders);

                        // --- FORMAT RESPONSE ---
                        const providerList = availableProviders.map(p => {
                            const service = servicesInRange.find(
                                s => (s as any).provider._id.toString() === p._id.toString()
                            );

                            console.log(`[Chatbot] Mapping provider ${p._id}:`, { service });

                            return {
                                serviceId: service._id.toString(),
                                providerId: p._id.toString(),
                                name: p.fullName,
                                rating: p.rating,
                                price: service.price
                            };
                        });

                        console.log(`[Chatbot] ✅ Final provider list:`, providerList);

                        // --- 3. CRITICAL FIX: Update workingContext ---
                        workingContext.lastFoundProviders = providerList;
                        session.context.lastFoundProviders = providerList;
                        session.markModified("context");
                        await session.save();

                        console.log(`[Chatbot] Saved lastFoundProviders to session.context.`);

                        toolResult = { providers: providerList };
                        console.log(`[Chatbot] Returning toolResult:`, toolResult);

                        console.log("================= 🟩 [Chatbot] findAvailableProvidersForSlot END 🟩 =====================\n");
                        break;
                    }


                    case "initiatePayment": {
                        console.log("\n================= 🟦 [Chatbot] initiatePayment START 🟦 =================");

                        console.log(`[Chatbot] Raw call.args:`, call.args);

                        const { customerName, phone, instructions } = call.args as any;
                        console.log(`[Chatbot] Extracted:`);
                        console.log(` - customerName: ${customerName}`);
                        console.log(` - phone: ${phone}`);
                        console.log(` - instructions: ${instructions}`);

                        // Update context
                        workingContext.customerName = customerName;
                        workingContext.phone = phone;
                        workingContext.instructions = instructions;

                        console.log(`[Chatbot] Updated context after adding customer details:`, JSON.stringify(workingContext, null, 2));

                        // Find selected provider
                        console.log(`[Chatbot] Looking for providerId in context: ${workingContext.providerId}`);
                        console.log(`[Chatbot] lastFoundProviders:`, JSON.stringify(workingContext.lastFoundProviders, null, 2));

                        if (!workingContext.providerId) {
                            // Check if user message contained a number choice for provider
                            const match = userMessage.match(/^\s*(\d+)\s*$/);
                            if (match && workingContext.lastFoundProviders) {
                                const index = parseInt(match[1]) - 1;
                                if (workingContext.lastFoundProviders[index]) {
                                    workingContext.providerId = workingContext.lastFoundProviders[index].providerId;
                                    console.log(`[Chatbot] Inferred provider selection: ${workingContext.providerId}`);
                                }
                            }
                        }

                        const chosenProvider = (workingContext.lastFoundProviders as any[])?.find(
                            p => p.providerId === workingContext.providerId
                        );

                        if (!chosenProvider) {
                            console.error(`[Chatbot] ❌ No matching provider found for providerId: ${context.providerId}`);
                        } else {
                            console.log(`[Chatbot] Found chosen provider:`, chosenProvider);
                            workingContext.serviceId = chosenProvider.serviceId;
                            workingContext.amount = chosenProvider.price;

                            console.log(`[Chatbot] Updated context with serviceId and amount:`);
                            console.log(` - serviceId: ${chosenProvider.serviceId}`);
                            console.log(` - amount: ${chosenProvider.price}`);
                        }

                        console.log("[Chatbot] Saving session after provider mapping...");
                        await session.save();
                        console.log("[Chatbot] Session saved successfully.");

                        // Validation check
                        console.log("[Chatbot] Validating required payment fields...");

                        console.log(`serviceId: ${workingContext.serviceId}`);
                        console.log(`providerId: ${workingContext.providerId}`);
                        console.log(`addressId: ${workingContext.addressId}`);
                        console.log(`date: ${workingContext.date}`);
                        console.log(`time: ${workingContext.time}`);
                        console.log(`amount: ${workingContext.amount}`);

                        if (!workingContext.serviceId || !workingContext.providerId || !workingContext.addressId || !workingContext.date || !workingContext.time || !workingContext.amount) {
                            console.error(`[Chatbot] ❌ Missing critical booking info.`);
                            console.error(`[Chatbot] Full Context:`, JSON.stringify(context, null, 2));

                            toolResult = {
                                error: "Missing critical booking info. You must confirm all details with the user first."
                            };
                            console.log(`[Chatbot] Returning error toolResult.`);
                            break;
                        }

                        // Create order
                        console.log(`[Chatbot] Creating payment order for amount: ${context.amount}`);
                        const order = await this._PaymentService.createOrder(context.amount);

                        console.log(`[Chatbot] Order created successfully:`);
                        console.log(` - orderId: ${order.id}`);

                        // Build response
                        const response: IChatbotResponse = {
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

                        console.log(`[Chatbot] Final response payload:`, JSON.stringify(response, null, 2));

                        // Save message
                        console.log("[Chatbot] Saving message to messageRepo...");
                        await this._messageRepo.create({
                            sessionId: session._id,
                            role: "model",
                            text: response.text
                        });

                        console.log("[Chatbot] Message saved.");
                        console.log("[Chatbot] Saving session...");
                        session.context = workingContext;
                        session.markModified('context');
                        await session.save();
                        console.log("[Chatbot] Session saved.");

                        console.log("================= 🟩 [Chatbot] initiatePayment END 🟩 =====================\n");

                        return response;
                    }


                    default:
                        console.warn(`[Chatbot] Unknown tool: ${call.name}`);
                        toolResult = { error: "Unknown tool" };
                }

                console.log(`[Chatbot] ✅ Tool Result:`, JSON.stringify(toolResult, null, 2));

                const result2 = await chat.sendMessage([{ functionResponse: { name: call.name, response: toolResult } }]);
                botResponseText = result2.response.text() || "Got it. What's next?";
                console.log(`[Chatbot] 🤖 Final Response after tool: "${botResponseText}"`);

            } catch (err: any) {
                session.context = workingContext;
                session.markModified('context');
                await session.save();
                botResponseText = "Sorry, something went wrong while processing your request.";
                console.error("[Chatbot] 💥 Error executing tool:", err);
            }

            await this._messageRepo.create({ sessionId: session._id, role: "model", text: botResponseText });
            await session.save();
            return { role: "model", text: botResponseText };
        }

        const textResponse = response.text() || "Sorry, I'm not sure how to respond to that.";
        console.log(`[Chatbot] 🤖 Simple Text Response: "${textResponse}"`);

        await this._messageRepo.create({ sessionId: session._id, role: "model", text: textResponse });

        return { role: "model", text: textResponse };
    }


    // private async showAvailableSlots(session: IChatSession): Promise<IChatbotResponse> {
    //     const slots = await this.generateTimeSlots();
    //     session.context.availableSlots = slots;
    //     session.state = "awaiting_slot_selection";
    //     await session.save();

    //     const slotList = slots.map((s, i) => `${i + 1}. ${s.display}`).join('\n');
    //     const msg = `Great! Here are available time slots for ${session.context.selectedService?.name}:\n\n${slotList}\n\nPlease select a slot number.`;

    //     await this._messageRepo.create({ sessionId: session._id, role: "model", text: msg });
    //     return { role: "model", text: msg };
    // }

    // private async findProviders(session: IChatSession): Promise<void> {
    //     // This would be called automatically to find providers
    //     const providers = await this._providerService.findNearbyProviders(
    //         session.context.selectedAddress.coords.coordinates,
    //         10,
    //         session.context.selectedService.id
    //     );

    //     if (!providers || providers.length === 0) {
    //         const msg = `Sorry, no providers are available in your area. Would you like to try a different time slot?`;
    //         await this._messageRepo.create({ sessionId: session._id, role: "model", text: msg });
    //         return;
    //     }

    //     session.context.availableProviders = providers.map((p, i) => ({
    //         id: p._id,
    //         name: p.fullName,
    //         rating: p.rating || 4.0,
    //         number: i + 1
    //     }));
    //     session.state = "awaiting_provider_selection";
    //     await session.save();

    //     const providerList = session.context.availableProviders
    //         .map(p => `${p.number}. ${p.name} — ⭐ ${p.rating}/5.0`)
    //         .join('\n');

    //     const msg = `Excellent! Here are available providers:\n\n${providerList}\n\nPlease select a provider by number.`;
    //     await this._messageRepo.create({ sessionId: session._id, role: "model", text: msg });
    // }

    // private async generateTimeSlots(): Promise<Array<{ display: string, value: string }>> {
    //     const slots = [];
    //     const today = new Date();

    //     // Generate slots for next 7 days
    //     for (let day = 1; day <= 7; day++) {
    //         const date = new Date(today);
    //         date.setDate(today.getDate() + day);

    //         // Morning slots
    //         ['09:00', '10:00', '11:00'].forEach(time => {
    //             const dateTime = new Date(date);
    //             const [hours, minutes] = time.split(':');
    //             dateTime.setHours(parseInt(hours), parseInt(minutes), 0);

    //             slots.push({
    //                 display: `${date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at ${time} AM`,
    //                 value: dateTime.toISOString()
    //             });
    //         });

    //         // Afternoon slots
    //         ['14:00', '15:00', '16:00'].forEach(time => {
    //             const dateTime = new Date(date);
    //             const [hours, minutes] = time.split(':');
    //             dateTime.setHours(parseInt(hours), parseInt(minutes), 0);

    //             const displayHour = parseInt(hours) - 12;
    //             slots.push({
    //                 display: `${date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at ${displayHour}:${minutes} PM`,
    //                 value: dateTime.toISOString()
    //             });
    //         });
    //     }

    //     return slots.slice(0, 15); // Return first 15 slots
    // }

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

    async verifyRazorpayPayment(sessionId: string, paymentData: any) {
        const verified = await this._PaymentService.verifySignature(
            paymentData.razorpay_order_id,
            paymentData.razorpay_payment_id,
            paymentData.razorpay_signature
        );

        if (!verified) throw new Error("Payment verification failed");

        const session = await this._sessionRepo.findOne({ sessionId });
        if (!session || !session.context.pendingPayment) {
            throw new Error("Session or pending payment not found");
        }

        const { pendingPayment } = session.context;

        const booking = await this._bookingRepository.create({
            userId: session.userId,
            serviceId: pendingPayment.serviceId,
            providerId: pendingPayment.providerId,
            addressId: pendingPayment.addressId,
            paymentStatus: "Paid",
            amount: String(pendingPayment.amount),
            status: "Pending",
            scheduledDate: new Date(pendingPayment.scheduledAt).toISOString().split('T')[0],
            scheduledTime: new Date(pendingPayment.scheduledAt).toTimeString().slice(0, 5),
            createdBy: "Bot",
            paymentId: paymentData.razorpay_payment_id
        });

        // Update session
        session.context.completedBooking = {
            bookingId: booking._id,
            service: session.context.selectedService?.name,
            provider: session.context.selectedProvider?.name,
            time: session.context.selectedSlot?.display
        };
        session.state = "booking_completed";
        await session.save();

        // Send confirmation message
        const confirmationMsg = `
🎉 **Booking Confirmed!**

✅ Payment successful
📋 Booking ID: ${booking._id}
🛠️ Service: ${session.context.selectedService?.name}
👤 Provider: ${session.context.selectedProvider?.name}
🕐 Scheduled: ${session.context.selectedSlot?.display}

Your provider will contact you shortly. Thank you for using QuickMate!
        `.trim();

        await this._messageRepo.create({
            sessionId: session._id,
            role: "model",
            text: confirmationMsg
        });

        return booking;
    }

    async getSessionStatus(sessionId: string): Promise<any> {
        const session = await this._sessionRepo.findOne({ sessionId });
        if (!session) {
            throw new CustomError("Session not found", HttpStatusCode.NOT_FOUND);
        }

        return {
            sessionId: session.sessionId,
            state: session.state,
            context: session.context,
            userId: session.userId
        };
    }
}