import "reflect-metadata";
import { Container } from "inversify";
import { AuthController } from "../controllers/authController.js";
import { AuthService } from "../services/implementation/authService.js";
import { type IAuthService } from "../services/interface/IAuthService.js";
import { UserRepository } from "../repositories/implementation/userRepositories.js";
import { type IUserRepository } from "../repositories/interface/IUserRepository.js";
import TYPES from "./type.js";
import { CategoryController } from "../controllers/categoryController.js";
import { type ICategoryService } from "../services/interface/ICategoryService.js";
import { CategoryService } from "../services/implementation/categoryService.js";
import { type ICategoryRepository } from "../repositories/interface/ICategoryRepository.js";
import { CategoryRepository } from "../repositories/implementation/categoryRepository.js";
import { CommissionRuleRepository } from "../repositories/implementation/commissionRuleRepository.js";
import { type ICommissionRuleRepository } from "../repositories/interface/ICommissonRuleRepository.js";
import { type IProviderService } from "../services/interface/IProviderService.js";
import { ProviderController } from "../controllers/providerController.js";
import { ProviderService } from "../services/implementation/providerService.js";
import { type IProviderRepository } from "../repositories/interface/IProviderRepository.js";
import { ProviderRepository } from "../repositories/implementation/providerRepository.js";
import { AddressController } from "../controllers/addressController.js";
import { type IAddressService } from "../services/interface/IAddressService.js";
import { AddressService } from "../services/implementation/AddressService.js";
import { type IAddressRepository } from "../repositories/interface/IAddressRepository.js";
import { AddressRepository } from "../repositories/implementation/addressRepository.js";
import { BookingController } from "../controllers/bookingController.js";
import { type IBookingService } from "../services/interface/IBookingService.js";
import { BookingService } from "../services/implementation/bookingService.js";
import { type IBookingRepository } from "../repositories/interface/IBookingRepository.js";
import { BookingRepository } from "../repositories/implementation/bookingRepository.js";
import { ServiceController } from "../controllers/serviceController.js";
import { type IServiceService } from "../services/interface/IServiceService.js";
import { ServiceService } from "../services/implementation/serviceService.js";
import { type IServiceRepository } from "../repositories/interface/IServiceRepository.js";
import { ServiceRepository } from "../repositories/implementation/serviceRepository.js";
import { type IPaymentRepository } from "../repositories/interface/IPaymentRepository.js";
import { PaymentRepository } from "../repositories/implementation/paymentRepository.js";
import { type IMessageRepository } from "../repositories/interface/IMessageRepository.js";
import { MessageRepository } from "../repositories/implementation/messageRepository.js";
import { WalletController } from "../controllers/walletController.js";
import { type IWalletService } from "../services/interface/IWalletService.js";
import { WalletService } from "../services/implementation/WalletService.js";
import { type IWalletRepository } from "../repositories/interface/IWalletRepository.js";
import { WalletRepository } from "../repositories/implementation/WalletRepository.js";
import { ReviewController } from "../controllers/reviewController.js";
import { type IReviewService } from "../services/interface/IReviewService.js";
import { ReviewService } from "../services/implementation/reviewService.js";
import { type IReviewRepository } from "../repositories/interface/IReviewRepository.js";
import { ReviewRepository } from "../repositories/implementation/reviewRepository.js";
import { AdminController } from "../controllers/adminController.js";
import { type IAdminService } from "../services/interface/IAdminService.js";
import { AdminService } from "../services/implementation/AdminService.js";
import { SubscriptionPlanController } from "../controllers/subscriptionPlanController.js";
import { type ISubscriptionPlanService } from "../services/interface/ISubscriptionPlanService.js";
import { type ISubscriptionPlanRepository } from "../repositories/interface/ISubscriptionPlanRepository.js";
import { SubscriptionPlanService } from "../services/implementation/subscriptionPlanService.js";
import { SubscriptionPlanRepository } from "../repositories/implementation/subscriptionPlanRepository.js";
import { MessageController } from "../controllers/messageController.js";
import { ChatbotController } from "../controllers/chatBotController.js";
import { type IChatBotService } from "../services/interface/IChatBotService.js";
import { ChatbotService } from "../services/implementation/chatBotService.js";
import { type IChatSessionRepository } from "../repositories/interface/IChatSessionRepository.js";
import { type IChatMessageRepository } from "../repositories/interface/IChatMessageRepository.js";
import { ChatSessionRepository } from "../repositories/implementation/chatSessionRepository.js";
import { ChatMessageRepository } from "../repositories/implementation/chatMessageRepository.js";
import { type IPaymentService } from "../services/interface/IPaymentService.js";
import { PaymentService } from "../services/implementation/paymentService.js";

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
