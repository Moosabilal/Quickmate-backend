import { BaseRepository } from "../repositories/implementation/base/BaseRepository"
import { MessageRepository } from "../repositories/implementation/messageRepository"

const TYPES = {
    AuthController: Symbol.for('AuthController'),
    AuthService: Symbol.for('AuthService'),
    UserRepository: Symbol.for('UserRepository'),
    CategoryController: Symbol.for('CategoryController'),
    CategoryService: Symbol.for('CategoryService'),
    CategoryRepository: Symbol.for('CategoryRepository'),
    CommissionRuleRepository: Symbol.for('CommissionRuleRepository'),
    ProviderController: Symbol.for('ProviderController'),
    ProviderService: Symbol.for('ProviderService'),
    ProviderRepository: Symbol.for('ProviderRepository'),
    AddressController: Symbol.for('AddressController'),
    AddressService: Symbol.for('AddressService'),
    AddressRepository: Symbol.for('AddressRepository'),
    BookingController: Symbol.for('BookingController'),
    BookingService: Symbol.for('BookingService'),
    BookingRepository: Symbol.for('BookingRepository'),
    PaymentRepository: Symbol.for('PaymentRepository'),
    ServiceController: Symbol.for('ServiceController'),
    ServiceService: Symbol.for('ServiceService'),
    ServiceRepository: Symbol.for('ServiceRepository'),
    MessageRepository: Symbol.for('MessageRepository'),
    WalletController: Symbol.for('WalletController'),
    WalletService: Symbol.for('WalletService'),
    WalletRepository: Symbol.for('WalletRepository'),
    ReviewController: Symbol.for('ReviewerController'),
    ReviewService: Symbol.for('ReviewService'),
    ReviewRepository: Symbol.for('ReviewRepository'),

}

export default TYPES