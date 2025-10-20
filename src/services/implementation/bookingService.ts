import { inject, injectable } from "inversify";
import { IBookingRepository } from "../../repositories/interface/IBookingRepository";
import { IBookingService } from "../interface/IBookingService";
import TYPES from "../../di/type";
import { BookingOtpPayload, IAdminBookingsResponse, IBookingConfirmationRes, IBookingHistoryPage, IBookingLog, IBookingRequest, IGetMessages, IProviderBookingManagement } from "../../interface/booking";
import { paymentCreation, razorpay, verifyPaymentSignature } from "../../utils/razorpay";
import { CustomError } from "../../utils/CustomError";
import { ErrorMessage } from "../../enums/ErrorMessage";
import { HttpStatusCode } from "../../enums/HttpStatusCode";
import { RazorpayOrder } from "../../interface/razorpay";
import { createHmac } from "crypto";
import { IPaymentVerificationPayload, IPaymentVerificationRequest } from "../../interface/payment";
import { ICategoryRepository } from "../../repositories/interface/ICategoryRepository";
import { ICommissionRuleRepository } from "../../repositories/interface/ICommissonRuleRepository";
import { CommissionTypes } from "../../enums/CommissionType.enum";
import { IPaymentRepository } from "../../repositories/interface/IPaymentRepository";
import mongoose, { FilterQuery, Types } from "mongoose";
import { IPayment } from "../../models/payment";
import { PaymentMethod, PaymentStatus, Roles } from "../../enums/userRoles";
import { IAddressRepository } from "../../repositories/interface/IAddressRepository";
import { toBookingConfirmationPage, toBookingHistoryPage, toProviderBookingManagement } from "../../utils/mappers/booking.mapper";
import { IProviderRepository } from "../../repositories/interface/IProviderRepository";
import { IServiceRepository } from "../../repositories/interface/IServiceRepository";
import { IUserRepository } from "../../repositories/interface/IUserRepository";
import { IMessageRepository } from "../../repositories/interface/IMessageRepository";
import { IMessage } from "../../models/message";
import { BookingStatus } from "../../enums/booking.enum";
import { IWalletRepository } from "../../repositories/interface/IWalletRepository";
import { WalletRepository } from "../../repositories/implementation/WalletRepository";
import { TransactionStatus } from "../../enums/payment&wallet.enum";
import { IWallet } from "../../models/wallet";
import { ResendOtpRequestBody, VerifyOtpRequestBody } from "../../interface/auth";
import { generateOTP } from "../../utils/otpGenerator";
import { sendBookingVerificationEmail, sendVerificationEmail } from "../../utils/emailService";
import jwt from 'jsonwebtoken'
import { IReviewRepository } from "../../repositories/interface/IReviewRepository";
import { IReview } from "../../models/Review";
import { ISubscriptionPlanRepository } from "../../repositories/interface/ISubscriptionPlanRepository";
import { calculateCommission, calculateParentCommission } from "../../utils/helperFunctions/commissionRule";
import { applySubscriptionAdjustments } from "../../utils/helperFunctions/subscription";
import { IBooking } from "../../models/Booking";
import { isProviderInRange } from "../../utils/helperFunctions/locRangeCal";
import { convertDurationToMinutes } from "../../utils/helperFunctions/convertDurationToMinutes";


@injectable()
export class BookingService implements IBookingService {
    private _bookingRepository: IBookingRepository;
    private _categoryRepository: ICategoryRepository;
    private _commissionRuleRepository: ICommissionRuleRepository;
    private _paymentRepository: IPaymentRepository;
    private _addressRepository: IAddressRepository;
    private _providerRepository: IProviderRepository;
    private _serviceRepository: IServiceRepository;
    private _userRepository: IUserRepository;
    private _messageRepository: IMessageRepository;
    private _walletRepository: IWalletRepository;
    private _reviewRepository: IReviewRepository;
    private _subscriptionPlanRepository: ISubscriptionPlanRepository;
    constructor(@inject(TYPES.BookingRepository) bookingRepository: IBookingRepository,
        @inject(TYPES.CategoryRepository) categoryRepository: ICategoryRepository,
        @inject(TYPES.CommissionRuleRepository) commissionRuleRepository: ICommissionRuleRepository,
        @inject(TYPES.PaymentRepository) paymentRepository: IPaymentRepository,
        @inject(TYPES.AddressRepository) addressRepository: IAddressRepository,
        @inject(TYPES.ProviderRepository) providerRepository: IProviderRepository,
        @inject(TYPES.ServiceRepository) serviceRepository: IServiceRepository,
        @inject(TYPES.UserRepository) userRepository: IUserRepository,
        @inject(TYPES.MessageRepository) messageRepository: IMessageRepository,
        @inject(TYPES.WalletRepository) WalletRepository: IWalletRepository,
        @inject(TYPES.ReviewRepository) reviewRepository: IReviewRepository,
        @inject(TYPES.SubscriptionPlanRepository) subscriptionPlanRepository: ISubscriptionPlanRepository,
    ) {
        this._bookingRepository = bookingRepository;
        this._categoryRepository = categoryRepository;
        this._commissionRuleRepository = commissionRuleRepository
        this._paymentRepository = paymentRepository
        this._addressRepository = addressRepository;
        this._providerRepository = providerRepository;
        this._serviceRepository = serviceRepository;
        this._userRepository = userRepository;
        this._messageRepository = messageRepository;
        this._walletRepository = WalletRepository;
        this._reviewRepository = reviewRepository;
        this._subscriptionPlanRepository = subscriptionPlanRepository
    }

    async createNewBooking(data: Partial<IBookingRequest>): Promise<{ bookingId: string, message: string }> {

        const subCategoryId = data.serviceId
        const providerId = data.providerId
        const findServiceId = await this._serviceRepository.findOne({ subCategoryId, providerId })

        data.serviceId = findServiceId._id.toString()
        const bookings = await this._bookingRepository.create(data)
        return { bookingId: (bookings._id as { toString(): string }).toString(), message: "your booking confirmed successfully" }
    }

    async createPayment(amount: number): Promise<RazorpayOrder> {
        const order = await paymentCreation(amount)

        if (!order) {
            throw new CustomError(ErrorMessage.INTERNAL_ERROR, HttpStatusCode.INTERNAL_SERVER_ERROR)
        }

        return order as RazorpayOrder;
    }

    async paymentVerification(
        verifyPayment: IPaymentVerificationRequest
    ): Promise<{ message: string; orderId: string }> {
        let { razorpay_order_id, razorpay_payment_id, razorpay_signature } = verifyPayment;

        if (verifyPayment.paymentMethod === PaymentMethod.BANK) {
            const isValid = verifyPaymentSignature(
                razorpay_order_id,
                razorpay_payment_id,
                razorpay_signature
            );
            if (!isValid) throw new CustomError("transaction is not legit", HttpStatusCode.BAD_REQUEST);
        }

        const booking = await this._bookingRepository.findById(verifyPayment.bookingId);
        const service = await this._serviceRepository.findById(booking.serviceId.toString());
        const subCategory = await this._categoryRepository.findById(service.subCategoryId.toString());
        const commissionRule = await this._commissionRuleRepository.findOne({ categoryId: subCategory._id.toString() });

        let totalCommission = await calculateCommission(verifyPayment.amount, commissionRule);
        totalCommission += await calculateParentCommission(verifyPayment.amount, subCategory, this._categoryRepository, this._commissionRuleRepository);

        const provider = await this._providerRepository.findById(verifyPayment.providerId.toString());
        if (provider?.subscription?.status === "ACTIVE") {
            const plan = await this._subscriptionPlanRepository.findById(provider.subscription.planId.toString());
            totalCommission = applySubscriptionAdjustments(verifyPayment.amount, totalCommission, plan, commissionRule);
        }

        const updatedPayment = {
            ...verifyPayment,
            userId: new Types.ObjectId(verifyPayment.userId),
            providerId: new Types.ObjectId(verifyPayment.providerId),
            bookingId: new Types.ObjectId(verifyPayment.bookingId),
            adminCommission: totalCommission,
            providerAmount: verifyPayment.amount - totalCommission,
        };

        const createdPayment = await this._paymentRepository.create(updatedPayment as Partial<IPayment>);

        if (verifyPayment.paymentMethod === PaymentMethod.WALLET) {
            const wallet = await this._walletRepository.findOne({ ownerId: verifyPayment.userId });
            wallet.balance -= verifyPayment.amount;
            await this._walletRepository.update(wallet._id.toString(), wallet);

            await this._walletRepository.createTransaction({
                walletId: wallet._id,
                transactionType: "debit",
                source: "booking",
                remarks: `Order ${razorpay_order_id}`,
                amount: verifyPayment.amount,
                status: TransactionStatus.PAYMENT,
                description: `payment to ${service.title}`,
            });
        }

        const durationInMinutes = convertDurationToMinutes(service.duration);

        console.log('the service duration is:', typeof service.duration, service.duration)

        const udpatedpayment123 = await this._bookingRepository.update(verifyPayment.bookingId, {
            paymentId: createdPayment._id,
            paymentStatus: PaymentStatus.PAID,
            duration: durationInMinutes
        });

        return {
            message: "payment successfully verified",
            orderId: createdPayment.razorpay_order_id,
        };
    }

    async findBookingById(id: string): Promise<IBookingConfirmationRes> {
        const booking = await this._bookingRepository.findById(id);

        if (!booking) {
            throw new CustomError('Your booking is not found, Please contact admin', HttpStatusCode.NOT_FOUND);
        }
        const address = booking.addressId
            ? await this._addressRepository.findById(booking.addressId.toString())
            : null;

        if (!address) {
            throw new CustomError('No matched address found', HttpStatusCode.NOT_FOUND);
        }

        const service = booking.serviceId
            ? await this._serviceRepository.findById(booking.serviceId.toString())
            : null;

        if (!service) {
            throw new CustomError('No service found', HttpStatusCode.NOT_FOUND);
        }

        const subCat = service.subCategoryId
            ? await this._categoryRepository.findById(service.subCategoryId.toString())
            : null;

        if (!subCat) {
            throw new CustomError('No service found', HttpStatusCode.NOT_FOUND);
        }

        const provider = booking.providerId
            ? await this._providerRepository.findById(booking.providerId.toString())
            : null;

        if (!provider) {
            throw new CustomError('No provider found', HttpStatusCode.NOT_FOUND);
        }

        const payment = booking.paymentId
            ? await this._paymentRepository.findById(booking.paymentId.toString())
            : null;

        let review: IReview | undefined;
        if (booking.reviewed) {
            review = await this._reviewRepository.findOne({ bookingId: booking._id.toString() });
        }

        return toBookingConfirmationPage(booking, address, subCat.iconUrl, service, payment, provider, review);
    }


    async getAllFilteredBookings(userId: string): Promise<IBookingHistoryPage[]> {
        const bookings = await this._bookingRepository.findAll({ userId }, { createdAt: -1 });

        const providerIds = [...new Set(bookings.map(s => {
            return s.providerId?.toString();
        }).filter(Boolean))];

        const providers = await this._providerRepository.findAll({ _id: { $in: providerIds } });

        const addressIds = [...new Set(bookings.map(s => {
            return s.addressId?.toString();
        }).filter(Boolean))];

        const addresses = await this._addressRepository.findAll({ _id: { $in: addressIds } });

        const serviceIds = [...new Set(bookings.map(s => {
            return s.serviceId?.toString();
        }).filter(Boolean))];

        const services = await this._serviceRepository.findAll({ _id: { $in: serviceIds } });

        const subCategoryIds = [...new Set(services.map(s => {
            return s.subCategoryId?.toString();
        }).filter(Boolean))];

        const subCategories = await this._categoryRepository.findAll({ _id: { $in: subCategoryIds } });

        const providerMap = new Map(providers.map(prov => [prov._id.toString(), { fullName: prov.fullName, profilePhoto: prov.profilePhoto }]));
        const subCategoryMap = new Map(subCategories.map(sub => [sub._id.toString(), { iconUrl: sub.iconUrl }]));
        const serviceMap = new Map(services.map(serv => [serv._id.toString(), { title: serv.title, priceUnit: serv.priceUnit, duration: serv.duration, price: serv.price, subCategoryId: serv.subCategoryId.toString() }]));
        const addressMap = new Map(addresses.map(add => [add._id.toString(), { street: add.street, city: add.city }]));

        const mappedBooking = toBookingHistoryPage(bookings, addressMap, providerMap, subCategoryMap, serviceMap);
        return mappedBooking;
    }


    async getBookingFor_Prov_mngmnt(
        userId: string,
        providerId: string,
        search: string
    ): Promise<{ earnings: number; bookings: IProviderBookingManagement[] }> {

        const provider = await this._providerRepository.findById(providerId);

        const bookings = await this._bookingRepository.findAll({ providerId, userId: { $ne: userId } });

        let filteredBookings = bookings;
        if (search) {
            const searchRegex = { $regex: search, $options: 'i' };
            const matchedUsers = await this._userRepository.findAll({ name: searchRegex });
            const userIds = matchedUsers.map(u => u._id.toString());
            filteredBookings = bookings.filter(b => userIds.includes(b.userId?.toString() || ''));
        }

        const userIds = [...new Set(filteredBookings.map(b => b.userId?.toString()).filter(Boolean))];
        const serviceIds = [...new Set(filteredBookings.map(b => b.serviceId?.toString()).filter(Boolean))];
        const addressIds = [...new Set(filteredBookings.map(b => b.addressId?.toString()).filter(Boolean))];
        const paymentIds = [...new Set(filteredBookings.map(b => b.paymentId?.toString()).filter(Boolean))];

        const [users, services, addresses, payments] = await Promise.all([
            this._userRepository.findAll({ _id: { $in: userIds } }),
            this._serviceRepository.findAll({ _id: { $in: serviceIds } }),
            this._addressRepository.findAll({ _id: { $in: addressIds } }),
            this._paymentRepository.findAll({ _id: { $in: paymentIds } })
        ]);

        const mappedBookings = toProviderBookingManagement(filteredBookings, users, services, addresses, payments);

        return {
            earnings: Number(provider?.earnings || 0),
            bookings: mappedBookings
        };
    }

    async saveAndEmitMessage(io: any, joiningId: string, senderId: string, text: string) {
        const data = {
            joiningId,
            senderId: senderId,
            text,
        };

        const message = await this._messageRepository.create(data);

        io.to(joiningId).emit("receiveBookingMessage", message);

        return message;
    }

    async getBookingMessages(joiningId: string): Promise<IMessage[]> {
        const data = await this._messageRepository.findAllSorted(joiningId);

        return data

    }

    async updateStatus(bookingId: string, status: BookingStatus, userId?: string): Promise<{ message: string, completionToken?: string }> {
        const booking = await this._bookingRepository.findById(bookingId)
        if (!booking) {
            throw new CustomError(ErrorMessage.BOOKING_NOT_FOUND, HttpStatusCode.NOT_FOUND)
        }
        if (booking.status === BookingStatus.CANCELLED) {
            return { message: ErrorMessage.BOOKING_IS_ALREADY_CANCELLED }
        }
        let bookingOtp: string | undefined;
        if (status === BookingStatus.CANCELLED) {
            const userId = booking.userId.toString()
            const wallet = await this._walletRepository.findOne({ ownerId: userId })
            let returAmount: number;
            if (booking.status === BookingStatus.CONFIRMED) {
                returAmount = (Number(booking.amount) * 0.5)
                wallet.balance += returAmount
            } else {
                returAmount = Number(booking.amount)
                wallet.balance += returAmount
            }
            await this._walletRepository.update(wallet._id.toString(), wallet)
            const paymentId = booking.paymentId.toString()
            const payment = await this._paymentRepository.findById(paymentId)
            const service = await this._serviceRepository.findById(booking.serviceId.toString())
            await this._walletRepository.createTransaction(
                {
                    walletId: wallet._id,
                    transactionType: "credit",
                    source: "refund",
                    remarks: `Order ${payment.razorpay_order_id}`,
                    amount: returAmount,
                    status: TransactionStatus.REFUND,
                    description: `Refund Received from ${service.title}`,
                },
            );


        } else if (status === BookingStatus.COMPLETED) {
            const user = await this._userRepository.findById(userId)
            if (!user) {
                throw new CustomError('userId not found', HttpStatusCode.NOT_FOUND)
            }
            const otp = generateOTP()
            bookingOtp = jwt.sign({ bookingId, otp }, process.env.JWT_SECRET, { expiresIn: "10m" })
            await sendBookingVerificationEmail(String(user.email), otp)
            return {
                message: `An OTP has been sent to Customers Email for verification, please verify that OTP`,
                completionToken: bookingOtp

            }
        }
        await this._bookingRepository.update(bookingId, { status: status })

        return {
            message: `Booking ${status === BookingStatus.IN_PROGRESS ? 'Started' : ''} ${status} Successfully`,
        }
    }

    async updateBookingDateTime(bookingId: string, date: string, time: string): Promise<void> {
        const booking = await this._bookingRepository.findById(bookingId)
        if (!booking) {
            throw new CustomError(ErrorMessage.BOOKING_NOT_FOUND, HttpStatusCode.NOT_FOUND)
        }
        if (booking.status !== BookingStatus.PENDING) {
            throw new CustomError("You can only udpate Date/Time on Pending", HttpStatusCode.BAD_REQUEST)
        }
        await this._bookingRepository.update(bookingId, { scheduledDate: date, scheduledTime: time })
    }

    public async verifyOtp(data: VerifyOtpRequestBody, bookingToken: string): Promise<void> {
        const { email, otp } = data;

        const user = await this._userRepository.findByEmail(email, true);

        if (!user) {
            throw new CustomError(ErrorMessage.USER_NOT_FOUND, HttpStatusCode.NOT_FOUND)
        }

        try {
            const decoded = jwt.verify(bookingToken, process.env.JWT_SECRET as string) as BookingOtpPayload;
            if (!decoded) {
                throw new CustomError(`OTP ${ErrorMessage.TOKEN_EXPIRED}`, HttpStatusCode.FORBIDDEN)
            }
            if (otp !== decoded.otp) {
                throw new CustomError(ErrorMessage.INVALID_OTP, HttpStatusCode.BAD_REQUEST)
            }
            const booking = await this._bookingRepository.findById(decoded.bookingId)
            if (!booking) {
                throw new CustomError(ErrorMessage.BOOKING_NOT_FOUND, HttpStatusCode.NOT_FOUND)
            }
            booking.status = BookingStatus.COMPLETED
            await this._bookingRepository.update(booking._id.toString(), booking)

            const [provider, payment, service] = await Promise.all([
                this._providerRepository.findOne({ userId: user._id.toString() }),
                this._paymentRepository.findById(booking.paymentId.toString()),
                this._serviceRepository.findById(booking.serviceId.toString())
            ]);

            console.log('the payment details are:', payment)

            const wallet = await this._walletRepository.findOne({ ownerId: user._id.toString() })
            if (!wallet) {
                await this._walletRepository.create({
                    balance: payment.providerAmount,
                    ownerId: user._id as Types.ObjectId,
                    ownerType: Roles.PROVIDER,
                })
            } else {
                console.log('the payment amount is:', payment.providerAmount)
                wallet.balance += payment.providerAmount
                provider.earnings += payment.providerAmount;
                provider.totalBookings += 1
            }
            await this._walletRepository.createTransaction(
                {
                    walletId: wallet._id,
                    transactionType: "credit",
                    source: "payment",
                    remarks: `Order ${payment.razorpay_order_id}`,
                    amount: payment.providerAmount,
                    status: TransactionStatus.PAYMENT,
                    description: `Payment Received from ${service.title}`,
                },
            );

            await this._providerRepository.update(provider._id.toString(), provider)



        } catch (error) {
            throw new CustomError(ErrorMessage.OTP_VERIFICATION_FAILED, HttpStatusCode.FORBIDDEN)
        }

    }

    public async resendOtp(data: ResendOtpRequestBody, userId?: string): Promise<{ message: string, newCompletionToken?: string }> {
        const { email } = data;
        const user = await this._userRepository.findByEmail(email, true);

        if (!user) {
            throw new CustomError(ErrorMessage.USER_NOT_FOUND, HttpStatusCode.NOT_FOUND)
        }

        const newOtp = generateOTP();
        const newBookingOtp = jwt.sign({ userId, newOtp }, process.env.JWT_SECRET, { expiresIn: "10m" })

        await sendVerificationEmail(email, newOtp);

        return {
            message: 'A new OTP has been sent to your email.',
            newCompletionToken: newBookingOtp
        };
    }

    public async getAllBookingsForAdmin(
        page: number,
        limit: number,
        filters: { search?: string; bookingStatus?: string; }
    ): Promise<IAdminBookingsResponse> {

        const bookingFilter: FilterQuery<IBooking> = {};

        if (filters.search) {
            const searchRegex = { $regex: filters.search, $options: 'i' };

            const [matchedUsers, matchedProviders] = await Promise.all([
                this._userRepository.findAll({ name: searchRegex }),
                this._providerRepository.findAll({ fullName: searchRegex })
            ]);

            const userIds = matchedUsers.map(u => u._id);
            const providerIds = matchedProviders.map(p => p._id);

            bookingFilter.$or = [
                { userId: { $in: userIds } },
                { providerId: { $in: providerIds } }
            ];
        }

        if (filters.bookingStatus && filters.bookingStatus !== 'All') {
            bookingFilter.status = filters.bookingStatus;
        }

        const allBookings = await this._bookingRepository.findAll(bookingFilter, { createdAt: -1 });

        const totalBookings = allBookings.length;
        const paginatedBookings = allBookings.slice((page - 1) * limit, page * limit);

        const userIds = [...new Set(paginatedBookings.map(b => b.userId?.toString()).filter(Boolean))];
        const providerIds = [...new Set(paginatedBookings.map(b => b.providerId?.toString()).filter(Boolean))];
        const serviceIds = [...new Set(paginatedBookings.map(b => b.serviceId?.toString()).filter(Boolean))];

        const [users, providers, services] = await Promise.all([
            this._userRepository.findAll({ _id: { $in: userIds } }),
            this._providerRepository.findAll({ _id: { $in: providerIds } }),
            this._serviceRepository.findAll({ _id: { $in: serviceIds } })
        ]);

        const userMap = new Map(users.map(u => [u.id, u]));
        const providerMap = new Map(providers.map(p => [p.id, p]));
        const serviceMap = new Map(services.map(s => [s.id, s]));

        const bookings: IBookingLog[] = paginatedBookings.map(booking => {
            const user = userMap.get(booking.userId?.toString());
            const provider = providerMap.get(booking.providerId?.toString());
            const service = serviceMap.get(booking.serviceId?.toString());

            return {
                id: booking._id.toString(),
                userName: user?.name as string || 'N/A',
                userAvatar: (user?.profilePicture as string) || `https://i.pravatar.cc/150?u=${user?.id}`,
                providerName: provider?.fullName as string || 'N/A',
                serviceType: service?.title as string || 'N/A',
                dateTime: `${booking.scheduledDate || ''} ${booking.scheduledTime || ''}`.trim(),
                paymentStatus: booking.paymentStatus as PaymentStatus,
                bookingStatus: booking.status as BookingStatus,
            };
        });

        return {
            bookings,
            totalBookings,
            currentPage: page,
            totalPages: Math.ceil(totalBookings / limit),
        };
    }

    public async findProviderRange(userId: string, serviceId: string, lat: number, lng: number, radius: number): Promise<boolean> {
        const services = await this._serviceRepository.findAll({ subCategoryId: serviceId })
        if (!services || services.length <= 0) {
            throw new CustomError('Currently no service available', HttpStatusCode.NOT_FOUND);
        }
        const currentProvider = await this._providerRepository.findOne({userId: userId})
        const currentProviderId = currentProvider._id.toString()
        const providerids = services.map(s => s.providerId.toString()).filter(id => id !== currentProviderId);
        const providers = await this._providerRepository.findAll({ _id: { $in: providerids } })
        return isProviderInRange(providers, lat, lng, radius);
    }


}