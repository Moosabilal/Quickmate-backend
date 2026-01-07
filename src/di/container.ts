import "reflect-metadata";
import { Container } from "inversify";
import { AuthController } from "../controllers/authController";
import { AuthService } from "../services/implementation/authService";
import { type IAuthService } from "../services/interface/IAuthService";
import { UserRepository } from "../repositories/implementation/userRepositories";
import { type IUserRepository } from "../repositories/interface/IUserRepository";
import TYPES from "./type";
import { CategoryController } from "../controllers/categoryController";
import { type ICategoryService } from "../services/interface/ICategoryService";
import { CategoryService } from "../services/implementation/categoryService";
import { type ICategoryRepository } from "../repositories/interface/ICategoryRepository";
import { CategoryRepository } from "../repositories/implementation/categoryRepository";
import { CommissionRuleRepository } from "../repositories/implementation/commissionRuleRepository";
import { type ICommissionRuleRepository } from "../repositories/interface/ICommissonRuleRepository";
import { type IProviderService } from "../services/interface/IProviderService";
import { ProviderController } from "../controllers/providerController";
import { ProviderService } from "../services/implementation/providerService";
import { type IProviderRepository } from "../repositories/interface/IProviderRepository";
import { ProviderRepository } from "../repositories/implementation/providerRepository";
import { AddressController } from "../controllers/addressController";
import { type IAddressService } from "../services/interface/IAddressService";
import { AddressService } from "../services/implementation/AddressService";
import { type IAddressRepository } from "../repositories/interface/IAddressRepository";
import { AddressRepository } from "../repositories/implementation/addressRepository";
import { BookingController } from "../controllers/bookingController";
import { type IBookingService } from "../services/interface/IBookingService";
import { BookingService } from "../services/implementation/bookingService";
import { type IBookingRepository } from "../repositories/interface/IBookingRepository";
import { BookingRepository } from "../repositories/implementation/bookingRepository";
import { ServiceController } from "../controllers/serviceController";
import { type IServiceService } from "../services/interface/IServiceService";
import { ServiceService } from "../services/implementation/serviceService";
import { type IServiceRepository } from "../repositories/interface/IServiceRepository";
import { ServiceRepository } from "../repositories/implementation/serviceRepository";
import { type IPaymentRepository } from "../repositories/interface/IPaymentRepository";
import { PaymentRepository } from "../repositories/implementation/paymentRepository";
import { type IMessageRepository } from "../repositories/interface/IMessageRepository";
import { MessageRepository } from "../repositories/implementation/messageRepository";
import { WalletController } from "../controllers/walletController";
import { type IWalletService } from "../services/interface/IWalletService";
import { WalletService } from "../services/implementation/WalletService";
import { type IWalletRepository } from "../repositories/interface/IWalletRepository";
import { WalletRepository } from "../repositories/implementation/WalletRepository";
import { ReviewController } from "../controllers/reviewController";
import { type IReviewService } from "../services/interface/IReviewService";
import { ReviewService } from "../services/implementation/reviewService";
import { type IReviewRepository } from "../repositories/interface/IReviewRepository";
import { ReviewRepository } from "../repositories/implementation/reviewRepository";
import { AdminController } from "../controllers/adminController";
import { type IAdminService } from "../services/interface/IAdminService";
import { AdminService } from "../services/implementation/AdminService";
import { SubscriptionPlanController } from "../controllers/subscriptionPlanController";
import { type ISubscriptionPlanService } from "../services/interface/ISubscriptionPlanService";
import { type ISubscriptionPlanRepository } from "../repositories/interface/ISubscriptionPlanRepository";
import { SubscriptionPlanService } from "../services/implementation/subscriptionPlanService";
import { SubscriptionPlanRepository } from "../repositories/implementation/subscriptionPlanRepository";
import { MessageController } from "../controllers/messageController";
import { ChatbotController } from "../controllers/chatBotController";
import { type IChatBotService } from "../services/interface/IChatBotService";
import { ChatbotService } from "../services/implementation/chatBotService";
import { type IChatSessionRepository } from "../repositories/interface/IChatSessionRepository";
import { type IChatMessageRepository } from "../repositories/interface/IChatMessageRepository";
import { ChatSessionRepository } from "../repositories/implementation/chatSessionRepository";
import { ChatMessageRepository } from "../repositories/implementation/chatMessageRepository";
import { type IPaymentService } from "../services/interface/IPaymentService";
import { PaymentService } from "../services/implementation/paymentService";

const container = new Container();
container.bind<AuthController>(TYPES.AuthController).to(AuthController);
container.bind<IAuthService>(TYPES.AuthService).to(AuthService);
container.bind<IUserRepository>(TYPES.UserRepository).to(UserRepository);

container.bind<AdminController>(TYPES.AdminController).to(AdminController);
container.bind<IAdminService>(TYPES.AdminService).to(AdminService);

container.bind<CategoryController>(TYPES.CategoryController).to(CategoryController);
container.bind<ICategoryService>(TYPES.CategoryService).to(CategoryService);
container.bind<ICategoryRepository>(TYPES.CategoryRepository).to(CategoryRepository);
container.bind<ICommissionRuleRepository>(TYPES.CommissionRuleRepository).to(CommissionRuleRepository);

container.bind<ProviderController>(TYPES.ProviderController).to(ProviderController);
container.bind<IProviderService>(TYPES.ProviderService).to(ProviderService);
container.bind<IProviderRepository>(TYPES.ProviderRepository).to(ProviderRepository);

container.bind<AddressController>(TYPES.AddressController).to(AddressController);
container.bind<IAddressService>(TYPES.AddressService).to(AddressService);
container.bind<IAddressRepository>(TYPES.AddressRepository).to(AddressRepository);

container.bind<BookingController>(TYPES.BookingController).to(BookingController);
container.bind<IBookingService>(TYPES.BookingService).to(BookingService);
container.bind<IBookingRepository>(TYPES.BookingRepository).to(BookingRepository);

container.bind<IPaymentService>(TYPES.PaymentService).to(PaymentService);
container.bind<IPaymentRepository>(TYPES.PaymentRepository).to(PaymentRepository);

container.bind<ServiceController>(TYPES.ServiceController).to(ServiceController);
container.bind<IServiceService>(TYPES.ServiceService).to(ServiceService);
container.bind<IServiceRepository>(TYPES.ServiceRepository).to(ServiceRepository);

container.bind<IMessageRepository>(TYPES.MessageRepository).to(MessageRepository);

container.bind<WalletController>(TYPES.WalletController).to(WalletController);
container.bind<IWalletService>(TYPES.WalletService).to(WalletService);
container.bind<IWalletRepository>(TYPES.WalletRepository).to(WalletRepository);

container.bind<ReviewController>(TYPES.ReviewController).to(ReviewController);
container.bind<IReviewService>(TYPES.ReviewService).to(ReviewService);
container.bind<IReviewRepository>(TYPES.ReviewRepository).to(ReviewRepository);

container.bind<SubscriptionPlanController>(TYPES.SubscriptionPlanController).to(SubscriptionPlanController);
container.bind<ISubscriptionPlanService>(TYPES.SubscriptionPlanService).to(SubscriptionPlanService);
container.bind<ISubscriptionPlanRepository>(TYPES.SubscriptionPlanRepository).to(SubscriptionPlanRepository);

container.bind<MessageController>(TYPES.MessageController).to(MessageController);

container.bind<ChatbotController>(TYPES.ChatbotController).to(ChatbotController);
container.bind<IChatBotService>(TYPES.ChatbotService).to(ChatbotService);
container.bind<IChatSessionRepository>(TYPES.ChatSessionRepository).to(ChatSessionRepository);
container.bind<IChatMessageRepository>(TYPES.ChatMessageRepository).to(ChatMessageRepository);

export { container };
