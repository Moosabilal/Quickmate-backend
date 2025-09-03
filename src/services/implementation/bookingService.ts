import { inject, injectable } from "inversify";
import { IBookingRepository } from "../../repositories/interface/IBookingRepository";
import { IBookingService } from "../interface/IBookingService";
import TYPES from "../../di/type";
import { IBookingConfirmationRes, IBookingHistoryPage, IBookingRequest, IGetMessages, IProviderBookingManagement } from "../../dto/booking.dto";
import { paymentCreation, razorpay, verifyPaymentSignature } from "../../utils/razorpay";
import { CustomError } from "../../utils/CustomError";
import { ErrorMessage } from "../../enums/ErrorMessage";
import { HttpStatusCode } from "../../enums/HttpStatusCode";
import { RazorpayOrder } from "../../dto/razorpay.dto";
import { createHmac } from "crypto";
import { IPaymentVerificationRequest } from "../../dto/payment.dto";
import { ICategoryRepository } from "../../repositories/interface/ICategoryRepository";
import { ICommissionRuleRepository } from "../../repositories/interface/ICommissonRuleRepository";
import { CommissionTypes } from "../../enums/CommissionType.enum";
import { IPaymentRepository } from "../../repositories/interface/IPaymentRepository";
import mongoose, { Types } from "mongoose";
import { IPayment } from "../../models/payment";
import { PaymentStatus } from "../../enums/userRoles";
import { IAddressRepository } from "../../repositories/interface/IAddressRepository";
import { toBookingConfirmationPage, toBookingHistoryPage, toProviderBookingManagement } from "../../mappers/booking.mapper";
import { IProviderRepository } from "../../repositories/interface/IProviderRepository";
import { IServiceRepository } from "../../repositories/interface/IServiceRepository";
import { IUserRepository } from "../../repositories/interface/IUserRepository";
import { IMessageRepository } from "../../repositories/interface/IMessageRepository";
import { IMessage } from "../../models/message";
import { BookingStatus } from "../../enums/booking.enum";

@injectable()
export class BookingService implements IBookingService {
    private bookingRepository: IBookingRepository;
    private categoryRepository: ICategoryRepository;
    private commissionRuleRepository: ICommissionRuleRepository;
    private paymentRepository: IPaymentRepository;
    private addressRepository: IAddressRepository;
    private providerRepository: IProviderRepository;
    private serviceRepository: IServiceRepository;
    private userRepository: IUserRepository;
    private messageRepository: IMessageRepository;
    constructor(@inject(TYPES.BookingRepository) bookingRepository: IBookingRepository,
        @inject(TYPES.CategoryRepository) categoryRepository: ICategoryRepository,
        @inject(TYPES.CommissionRuleRepository) commissionRuleRepository: ICommissionRuleRepository,
        @inject(TYPES.PaymentRepository) paymentRepository: IPaymentRepository,
        @inject(TYPES.AddressRepository) addressRepository: IAddressRepository,
        @inject(TYPES.ProviderRepository) providerRepository: IProviderRepository,
        @inject(TYPES.ServiceRepository) serviceRepository: IServiceRepository,
        @inject(TYPES.UserRepository) userRepository: IUserRepository,
        @inject(TYPES.MessageRepository) messageRepository: IMessageRepository
    ) {
        this.bookingRepository = bookingRepository;
        this.categoryRepository = categoryRepository;
        this.commissionRuleRepository = commissionRuleRepository
        this.paymentRepository = paymentRepository
        this.addressRepository = addressRepository;
        this.providerRepository = providerRepository;
        this.serviceRepository = serviceRepository;
        this.userRepository = userRepository;
        this.messageRepository = messageRepository;
    }

    async createNewBooking(data: Partial<IBookingRequest>): Promise<{ bookingId: string, message: string }> {
        // console.log('the providerId', data.providerId)
        // const isBooked = await this.bookingRepository.findOne({ userId: data.userId, serviceId: data.serviceId, providerId: data.providerId })
        // console.log(' the booked dtaa', isBooked)
        // const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago

        // if (isBooked.createdAt > oneHourAgo) {
        //     console.log('this is working')
        //     return {
        //         bookingId: isBooked._id.toString(),
        //         message: "you already paid for this booking"
        //     };
        // }
        const subCategoryId = data.serviceId
        console.log('the serviceid', subCategoryId)
        const findServiceId = await this.serviceRepository.findOne({ subCategoryId })

        console.log('the get servidddddddces', findServiceId)
        data.serviceId = findServiceId._id.toString()
        const bookings = await this.bookingRepository.create(data)
        return { bookingId: (bookings._id as { toString(): string }).toString(), message: "your booking confirmed successfully" }
    }

    async createPayment(amount: number): Promise<RazorpayOrder> {
        const order = await paymentCreation(amount)

        if (!order) {
            throw new CustomError(ErrorMessage.INTERNAL_ERROR, HttpStatusCode.INTERNAL_SERVER_ERROR)
        }

        return order as RazorpayOrder;
    }

    async paymentVerification(verifyPayment: IPaymentVerificationRequest): Promise<{ message: string, orderId: string, paymentId: string }> {
        // console.log('the booking id', verifyPayment.bookingId)
        // const isPaid = await this.bookingRepository.findById(verifyPayment.bookingId)
        // console.log('the bookings', isPaid)
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = verifyPayment

        // if (isPaid.paymentStatus === PaymentStatus.PAID) {
        //     return {
        //         message: "payment already verified",
        //         orderId: razorpay_order_id,
        //         paymentId: razorpay_payment_id
        //     }
        // }    
        const isValid = verifyPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
        if (!isValid) {
            throw new CustomError("transaction is not legit", HttpStatusCode.BAD_REQUEST)
        }


        const bookingId = verifyPayment.bookingId
        const booking = await this.bookingRepository.findById(bookingId)
        const service = await this.serviceRepository.findById(booking.serviceId.toString())
        const subCategoryId = service.subCategoryId.toString()
        const subCategory = await this.categoryRepository.findById(subCategoryId)

        const commission = await this.commissionRuleRepository.findOne({ categoryId: subCategory._id.toString() })
        let totalCommission = 0;
        if (commission.commissionType !== CommissionTypes.NONE) {
            commission.commissionType === CommissionTypes.PERCENTAGE
                ? totalCommission += (verifyPayment.amount * commission.commissionValue) / 100
                : totalCommission += commission.commissionValue
        }
        if (subCategory.parentId) {
            console.log('there is parentId')

            const category = await this.categoryRepository.findOne({ parentId: subCategory.parentId.toString() })
            console.log('we got the catehroy', category)
            const mainFilter = {
                categoryId: category._id.toString()
            }
            const parentCommission = await this.commissionRuleRepository.findOne(mainFilter)

            if (parentCommission.commissionType !== CommissionTypes.NONE) {
                parentCommission.commissionType === CommissionTypes.PERCENTAGE
                    ? totalCommission += (verifyPayment.amount * parentCommission.commissionValue) / 100
                    : totalCommission += parentCommission.commissionValue
            }
        }
        console.log('the totlal commission', totalCommission)

        const updatedPayment = {
            ...verifyPayment,
            userId: new Types.ObjectId(verifyPayment.userId),
            providerId: new Types.ObjectId(verifyPayment.providerId),
            bookingId: new Types.ObjectId(verifyPayment.bookingId),
            adminCommission: totalCommission,
            providerAmount: verifyPayment.amount - totalCommission
        };

        const createdPayment = await this.paymentRepository.create(updatedPayment as Partial<IPayment>);
        const updateBooking = {
            paymentId: createdPayment._id,
            paymentStatus: PaymentStatus.PAID
        }
        const book = await this.bookingRepository.update(verifyPayment.bookingId, updateBooking)

        return {
            message: "payment successfully verified",
            orderId: razorpay_order_id,
            paymentId: razorpay_payment_id
        }
    }

    async findBookingById(id: string): Promise<IBookingConfirmationRes> {
        const booking = await this.bookingRepository.findById(id)
        if (!booking) {
            throw new CustomError('Your booking is not found, Please contact admin', HttpStatusCode.NOT_FOUND)
        }
        const address = await this.addressRepository.findById(booking.addressId.toString())
        if (!address) {
            throw new CustomError('No mathced address found', HttpStatusCode.NOT_FOUND)
        }
        const service = await this.serviceRepository.findById(booking.serviceId.toString())
        if (!service) {
            throw new CustomError('No service found', HttpStatusCode.NOT_FOUND)
        }
        const subCat = await this.categoryRepository.findById(service.subCategoryId.toString())
        if (!subCat) {
            throw new CustomError('No service found', HttpStatusCode.NOT_FOUND)
        }
        const provider = await this.providerRepository.findById(booking.providerId.toString())
        if (!provider) {
            throw new CustomError('No provider found', HttpStatusCode.NOT_FOUND)
        }
        const payment = await this.paymentRepository.findById(booking.paymentId.toString())

        return toBookingConfirmationPage(booking, address, subCat.iconUrl, service, payment, provider);
    }

    async getAllFilteredBookings(userId: string): Promise<IBookingHistoryPage[]> {
        const bookings = (await this.bookingRepository.findAll({ userId }, { createdAt: -1}))
        const providerIds = [...new Set(bookings.map(s => s.providerId.toString()))]
        const providers = await this.providerRepository.findAll({ _id: { $in: providerIds } })
        const addressIds = [...new Set(bookings.map(s => s.addressId.toString()))]
        const addresses = await this.addressRepository.findAll({ _id: { $in: addressIds } })
        const serviceIds = [...new Set(bookings.map(s => s.serviceId.toString()))]
        const services = await this.serviceRepository.findAll({ _id: { $in: serviceIds } })
        const subCategoryIds = [...new Set(services.map(s => s.subCategoryId.toString()))]
        const subCategories = await this.categoryRepository.findAll({ _id: { $in: subCategoryIds } })

        const providerMap = new Map(providers.map(prov => [prov._id.toString(), { fullName: prov.fullName, profilePhoto: prov.profilePhoto }]))
        const subCategoryMap = new Map(subCategories.map(sub => [sub._id.toString(), { iconUrl: sub.iconUrl }]))
        const serviceMap = new Map(services.map(serv => [serv._id.toString(), { title: serv.title, priceUnit: serv.priceUnit, duration: serv.duration, price: serv.price, subCategoryId: serv.subCategoryId.toString() }]))
        const addressMap = new Map(addresses.map(add => [add._id.toString(), { street: add.street, city: add.city }]))

        const mappedBooking = toBookingHistoryPage(bookings, addressMap, providerMap, subCategoryMap, serviceMap)
        return mappedBooking

    }

    async getBookingFor_Prov_mngmnt(providerId: string): Promise<IProviderBookingManagement[]> {
        const bookings = await this.bookingRepository.findAll({ providerId });

        const userIds = [...new Set(bookings.map(b => b.userId?.toString()).filter(Boolean))];
        const users = await this.userRepository.findAll({ _id: { $in: userIds } });

        const serviceIds = [...new Set(bookings.map(b => b.serviceId?.toString()).filter(Boolean))];
        const services = await this.serviceRepository.findAll({ _id: { $in: serviceIds } });

        const addressIds = [...new Set(bookings.map(b => b.addressId?.toString()).filter(Boolean))];
        const addresses = await this.addressRepository.findAll({ _id: { $in: addressIds } });

        const paymentIds = [...new Set(bookings.map(b => b.paymentId?.toString()).filter(Boolean))];
        const payments = await this.paymentRepository.findAll({ _id: { $in: paymentIds } }); // fixed here

        return toProviderBookingManagement(bookings, users, services, addresses, payments);
    }

    async saveAndEmitMessage(io: any, bookingId: string, senderId: string, text: string) {
        const data = {
            bookingId: new mongoose.Types.ObjectId(bookingId),
            senderId: senderId,
            text,
        };

        const message = await this.messageRepository.create(data);

        io.to(bookingId).emit("receiveBookingMessage", message);

        return message;
    }

    async getBookingMessages(bookingId: string): Promise<IMessage[]> {

        return await this.messageRepository.findAllSorted(bookingId);
        
    }

    async updateStatus(bookingId: string, status: BookingStatus): Promise<{ message: string }> {
        const booking = await this.bookingRepository.findById(bookingId)
        if (!booking) {
            throw new CustomError(ErrorMessage.BOOKING_NOT_FOUND, HttpStatusCode.NOT_FOUND)
        }
        if (booking.status === BookingStatus.CANCELLED) {
            return { message: ErrorMessage.BOOKING_IS_ALREADY_CANCELLED }
        }
        await this.bookingRepository.update(bookingId, { status: status })
        return { message: ErrorMessage.BOOKING_CANCELLED_SUCCESSFULLY }
    }

    async updateBookingDateTime(bookingId: string, date: string, time: string): Promise<void> {
        const booking = await this.bookingRepository.findById(bookingId)
        if (!booking) {
            throw new CustomError(ErrorMessage.BOOKING_NOT_FOUND, HttpStatusCode.NOT_FOUND)
        }
        if (booking.status !== BookingStatus.PENDING) {
            throw new CustomError("You can only udpate Date/Time on Pending", HttpStatusCode.BAD_REQUEST)
        }
        await this.bookingRepository.update(bookingId, { scheduledDate: date, scheduledTime: time })
    }


}