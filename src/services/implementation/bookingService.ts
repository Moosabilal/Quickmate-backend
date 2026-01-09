import { inject, injectable } from "inversify";
import { type IBookingRepository } from "../../repositories/interface/IBookingRepository.js";
import { type IBookingService } from "../interface/IBookingService.js";
import TYPES from "../../di/type.js";
import {
  type BookingOtpPayload,
  type IAdminBookingsResponse,
  type IBookingConfirmationRes,
  type IBookingDetailData,
  type IBookingLog,
  type IBookingRequest,
  type IBookingStatusCount,
  type IBookingStatusCounts,
  type IProviderBookingsResponse,
  type IUserBookingsResponse,
} from "../../interface/booking.js";
import { initiateRefund, paymentCreation, verifyPaymentSignature } from "../../utils/razorpay.js";
import { CustomError } from "../../utils/CustomError.js";
import { ErrorMessage } from "../../enums/ErrorMessage.js";
import { HttpStatusCode } from "../../enums/HttpStatusCode.js";
import { type RazorpayOrder } from "../../interface/razorpay.js";
import { type IPaymentVerificationRequest } from "../../interface/payment.js";
import { type ICategoryRepository } from "../../repositories/interface/ICategoryRepository.js";
import { type ICommissionRuleRepository } from "../../repositories/interface/ICommissonRuleRepository.js";
import { type IPaymentRepository } from "../../repositories/interface/IPaymentRepository.js";
import mongoose, { type FilterQuery, Types, type UpdateQuery } from "mongoose";
import { type IPayment } from "../../models/payment.js";
import { PaymentMethod, PaymentStatus, Roles } from "../../enums/userRoles.js";
import { type IAddressRepository } from "../../repositories/interface/IAddressRepository.js";
import {
  toBookingConfirmationPage,
  toBookingMessagesDto,
  toGetAllFiltersBookingDto,
  toGetBookingForProvider,
} from "../../utils/mappers/booking.mapper.js";
import { type IProviderRepository } from "../../repositories/interface/IProviderRepository.js";
import { type IServiceRepository } from "../../repositories/interface/IServiceRepository.js";
import { type IUserRepository } from "../../repositories/interface/IUserRepository.js";
import { type IMessageRepository } from "../../repositories/interface/IMessageRepository.js";
import { type IMessage } from "../../models/message.js";
import { BookingStatus } from "../../enums/booking.enum.js";
import { type IWalletRepository } from "../../repositories/interface/IWalletRepository.js";
import { TransactionStatus } from "../../enums/payment&wallet.enum.js";
import { type ResendOtpRequestBody, type VerifyOtpRequestBody } from "../../interface/auth.js";
import { generateOTP } from "../../utils/otpGenerator.js";
import { sendBookingVerificationEmail, sendVerificationEmail } from "../../utils/emailService.js";
import jwt from "jsonwebtoken";
import { type IReviewRepository } from "../../repositories/interface/IReviewRepository.js";
import { type IReview } from "../../models/Review.js";
import { type ISubscriptionPlanRepository } from "../../repositories/interface/ISubscriptionPlanRepository.js";
import { calculateCommission } from "../../utils/helperFunctions/commissionRule.js";
import { applySubscriptionAdjustments } from "../../utils/helperFunctions/subscription.js";
import { type IBooking } from "../../models/Booking.js";
import { isProviderInRange } from "../../utils/helperFunctions/locRangeCal.js";
import { convertDurationToMinutes } from "../../utils/helperFunctions/convertDurationToMinutes.js";
import { type ISocketMessage } from "../../interface/message.js";
import { endOfDay, endOfMonth, endOfWeek, startOfDay, startOfMonth, startOfWeek } from "date-fns";
import { type Server } from "socket.io";
import { getSignedUrl } from "../../utils/cloudinaryUpload.js";
import { getBookingTimes } from "../../utils/helperFunctions/bookingUtils.js";
import type { ICategory } from "../../models/Categories.js";

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
  constructor(
    @inject(TYPES.BookingRepository) bookingRepository: IBookingRepository,
    @inject(TYPES.CategoryRepository) categoryRepository: ICategoryRepository,
    @inject(TYPES.CommissionRuleRepository)
    commissionRuleRepository: ICommissionRuleRepository,
    @inject(TYPES.PaymentRepository) paymentRepository: IPaymentRepository,
    @inject(TYPES.AddressRepository) addressRepository: IAddressRepository,
    @inject(TYPES.ProviderRepository) providerRepository: IProviderRepository,
    @inject(TYPES.ServiceRepository) serviceRepository: IServiceRepository,
    @inject(TYPES.UserRepository) userRepository: IUserRepository,
    @inject(TYPES.MessageRepository) messageRepository: IMessageRepository,
    @inject(TYPES.WalletRepository) WalletRepository: IWalletRepository,
    @inject(TYPES.ReviewRepository) reviewRepository: IReviewRepository,
    @inject(TYPES.SubscriptionPlanRepository)
    subscriptionPlanRepository: ISubscriptionPlanRepository,
  ) {
    this._bookingRepository = bookingRepository;
    this._categoryRepository = categoryRepository;
    this._commissionRuleRepository = commissionRuleRepository;
    this._paymentRepository = paymentRepository;
    this._addressRepository = addressRepository;
    this._providerRepository = providerRepository;
    this._serviceRepository = serviceRepository;
    this._userRepository = userRepository;
    this._messageRepository = messageRepository;
    this._walletRepository = WalletRepository;
    this._reviewRepository = reviewRepository;
    this._subscriptionPlanRepository = subscriptionPlanRepository;
  }

  async createNewBooking(data: Partial<IBookingRequest>): Promise<{ bookingId: string; message: string }> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const subCategoryId = data.serviceId;
      const providerId = data.providerId;

      const service = await this._serviceRepository.findOne({
        subCategoryId,
        providerId,
      });

      if (!service) {
        throw new CustomError("Service not found", HttpStatusCode.NOT_FOUND);
      }

      if (!data.scheduledDate || !data.scheduledTime) {
        throw new CustomError("Date and Time are required", HttpStatusCode.BAD_REQUEST);
      }

      const requestedDuration = convertDurationToMinutes(service.duration);
      const { start: reqStart, end: reqEnd } = getBookingTimes(
        data.scheduledDate,
        data.scheduledTime,
        requestedDuration,
      );

      const dayBookings = await this._bookingRepository.findByProviderAndDate(providerId!, data.scheduledDate, session);

      const hasConflict = dayBookings.some((booking) => {
        if (!booking.scheduledTime || !booking.duration) return false;

        const { start: existingStart, end: existingEnd } = getBookingTimes(
          booking.scheduledDate! as string,
          booking.scheduledTime as string,
          booking.duration as number,
        );

        return existingStart < reqEnd && existingEnd > reqStart;
      });

      if (hasConflict) {
        throw new CustomError(
          "This time slot is already booked. Your amount will creadit within 5-7 days. Please choose another time/Provider.",
          HttpStatusCode.CONFLICT,
        );
      }

      data.serviceId = service._id.toString();

      const newBooking = await this._bookingRepository.create(data, session);

      await session.commitTransaction();

      return {
        bookingId: (newBooking._id as Types.ObjectId).toString(),
        message: "Booking confirmed successfully",
      };
    } catch (error) {
      await session.abortTransaction();
      if (error.code === 11000) {
        throw new CustomError(
          "This time slot is already booked. Your amount will refunded within 5-7 days. Please choose another time/Provider.",
          HttpStatusCode.CONFLICT,
        );
      }
      throw error;
    } finally {
      session.endSession();
    }
  }

  async createPayment(amount: number): Promise<RazorpayOrder> {
    const order = await paymentCreation(amount);

    if (!order) {
      throw new CustomError(ErrorMessage.INTERNAL_ERROR, HttpStatusCode.INTERNAL_SERVER_ERROR);
    }

    return order as RazorpayOrder;
  }

  async paymentVerification(verifyPayment: IPaymentVerificationRequest): Promise<{ message: string; orderId: string }> {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = verifyPayment;

    if (verifyPayment.paymentMethod === PaymentMethod.BANK) {
      const isValid = verifyPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
      if (!isValid) throw new CustomError("transaction is not legit", HttpStatusCode.BAD_REQUEST);
    }

    const booking = await this._bookingRepository.findById(verifyPayment.bookingId);
    const service = await this._serviceRepository.findById(booking.serviceId.toString());
    const subCategory = await this._categoryRepository.findById(service.subCategoryId.toString());
    const commissionRule = await this._commissionRuleRepository.findOne({
      categoryId: subCategory._id.toString(),
    });

    let totalCommission = await calculateCommission(verifyPayment.amount, commissionRule);
    totalCommission += await this._calculateParentCommissionInternal(verifyPayment.amount, subCategory);

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
      const wallet = await this._walletRepository.findOne({
        ownerId: verifyPayment.userId,
      });
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

    await this._bookingRepository.update(verifyPayment.bookingId, {
      paymentId: createdPayment._id,
      paymentStatus: PaymentStatus.PAID,
      duration: durationInMinutes,
    });

    return {
      message: "payment successfully verified",
      orderId: createdPayment.razorpay_order_id,
    };
  }

  async findBookingById(id: string): Promise<IBookingConfirmationRes> {
    const booking = await this._bookingRepository.findById(id);

    if (!booking) {
      throw new CustomError("Your booking is not found, Please contact admin", HttpStatusCode.NOT_FOUND);
    }
    const address = booking.addressId ? await this._addressRepository.findById(booking.addressId.toString()) : null;

    if (!address) {
      throw new CustomError("No matched address found", HttpStatusCode.NOT_FOUND);
    }

    const service = booking.serviceId ? await this._serviceRepository.findById(booking.serviceId.toString()) : null;

    if (!service) {
      throw new CustomError("No service found", HttpStatusCode.NOT_FOUND);
    }

    const subCat = service.subCategoryId
      ? await this._categoryRepository.findById(service.subCategoryId.toString())
      : null;

    if (!subCat) {
      throw new CustomError("No service found", HttpStatusCode.NOT_FOUND);
    }

    const provider = booking.providerId ? await this._providerRepository.findById(booking.providerId.toString()) : null;

    if (!provider) {
      throw new CustomError("No provider found", HttpStatusCode.NOT_FOUND);
    }

    const payment = booking.paymentId ? await this._paymentRepository.findById(booking.paymentId.toString()) : null;

    const reviewStats = await this._reviewRepository.getReviewStatsByServiceIds([service._id.toString()]);
    const providerReviewStats = reviewStats.find((rs) => rs.serviceId.toString() === service._id.toString());

    let review: IReview | undefined;
    if (booking.reviewed) {
      review = await this._reviewRepository.findOne({
        bookingId: booking._id.toString(),
      });
    }

    return toBookingConfirmationPage(
      booking,
      address,
      subCat.iconUrl,
      service,
      payment,
      provider,
      review,
      providerReviewStats?.avgRating,
      providerReviewStats?.reviewCount,
    );
  }

  public async getAllFilteredBookings(
    userId: string,
    filters: { search?: string; status?: BookingStatus },
  ): Promise<IUserBookingsResponse> {
    const { search, status } = filters;

    const [data, statusCounts] = await Promise.all([
      this._bookingRepository.findBookingsForUserHistory(userId, {
        status,
        search,
      }),
      this._bookingRepository.getBookingStatusCounts(userId, search),
    ]);

    const { bookings } = data;

    const counts: IBookingStatusCounts = {
      [BookingStatus.All]: 0,
      [BookingStatus.PENDING]: 0,
      [BookingStatus.CONFIRMED]: 0,
      [BookingStatus.IN_PROGRESS]: 0,
      [BookingStatus.COMPLETED]: 0,
      [BookingStatus.CANCELLED]: 0,
      [BookingStatus.EXPIRED]: 0,
    };

    let allBookingsCount = 0;

    statusCounts.forEach((item: IBookingStatusCount) => {
      if (item._id && Object.prototype.hasOwnProperty.call(counts, item._id)) {
        counts[item._id] = item.count;
      }
      allBookingsCount += item.count;
    });
    counts.All = allBookingsCount;

    const securedBookings = bookings.map(toGetAllFiltersBookingDto);

    return {
      data: securedBookings,
      counts: counts,
    };
  }

  public async getBookingFor_Prov_mngmnt(
    providerId: string,
    search?: string,
    status?: BookingStatus,
  ): Promise<IProviderBookingsResponse> {
    const provider = await this._providerRepository.findById(providerId);
    if (!provider) {
      throw new CustomError("Provider not found", HttpStatusCode.NOT_FOUND);
    }

    const [data, statusCounts] = await Promise.all([
      this._bookingRepository.findBookingsForProvider(providerId, { status: status, search: search }, 1, 1000),
      this._bookingRepository.getBookingStatusCountsForProvider(providerId, search),
    ]);

    const { bookings } = data;

    const counts: IBookingStatusCounts = {
      [BookingStatus.All]: 0,
      [BookingStatus.PENDING]: 0,
      [BookingStatus.CONFIRMED]: 0,
      [BookingStatus.IN_PROGRESS]: 0,
      [BookingStatus.COMPLETED]: 0,
      [BookingStatus.CANCELLED]: 0,
      [BookingStatus.EXPIRED]: 0,
    };

    let allBookingsCount = 0;
    statusCounts.forEach((item: IBookingStatusCount) => {
      if (item._id && Object.prototype.hasOwnProperty.call(counts, item._id)) {
        counts[item._id] = item.count;
      }
      allBookingsCount += item.count;
    });
    counts.All = allBookingsCount;

    const securedBookings = bookings.map(toGetBookingForProvider);

    return {
      bookings: securedBookings,
      earnings: provider.earnings || 0,
      counts: counts,
    };
  }

  async saveAndEmitMessage(io: Server, messageData: ISocketMessage): Promise<Partial<IMessage>> {
    let signedFileUrl = messageData.fileUrl;

    if (messageData.messageType !== "text" && messageData.fileUrl) {
      signedFileUrl = getSignedUrl(messageData.fileUrl);
    }
    const dataToCreate = {
      joiningId: messageData.joiningId,
      senderId: messageData.senderId,
      messageType: messageData.messageType,
      text: messageData.text,
      fileUrl: messageData.fileUrl,
    };

    const savedMessage = await this._messageRepository.create(dataToCreate);

    const messageForFrontend = {
      ...savedMessage.toObject(),
      fileUrl: signedFileUrl,
    };

    io.to(savedMessage.joiningId).emit("receiveBookingMessage", messageForFrontend);

    return messageForFrontend;
  }

  async getBookingMessages(joiningId: string): Promise<ISocketMessage[]> {
    const datas = await this._messageRepository.findAllSorted(joiningId);

    const securedData = datas.map(toBookingMessagesDto);

    return securedData;
  }

  async updateStatus(
    bookingId: string,
    status: BookingStatus,
    userId?: string,
    role?: Roles,
  ): Promise<{ message: string; completionToken?: string }> {
    const booking = await this._bookingRepository.findById(bookingId);
    if (!booking) {
      throw new CustomError(ErrorMessage.BOOKING_NOT_FOUND, HttpStatusCode.NOT_FOUND);
    }

    if (booking.status === BookingStatus.CANCELLED) {
      return { message: ErrorMessage.BOOKING_IS_ALREADY_CANCELLED };
    }

    if (status === BookingStatus.IN_PROGRESS) {
      const dateTimeString = `${booking.scheduledTime} ${booking.scheduledDate}`;
      const scheduledTime = new Date(dateTimeString);
      const currenttimeStamp = new Date();
      const diffInMinutes = (scheduledTime.getTime() - currenttimeStamp.getTime()) / (1000 * 60);
      if (diffInMinutes > 5) {
        throw new CustomError(
          "You can start the booking only 5 minutes before the scheduled time",
          HttpStatusCode.BAD_REQUEST,
        );
      }
    }

    let bookingOtp: string | undefined;
    const updatePayload: UpdateQuery<IBooking> = { status: status };
    if (status === BookingStatus.CANCELLED) {
      const userId = booking.userId.toString();
      const wallet = await this._walletRepository.findOne({ ownerId: userId });
      let returAmount: number;
      if (booking.status === BookingStatus.CONFIRMED && role === Roles.USER) {
        returAmount = Number(booking.amount) * 0.5;
        wallet.balance += returAmount;
      } else {
        returAmount = Number(booking.amount);
        wallet.balance += returAmount;
      }
      await this._walletRepository.update(wallet._id.toString(), wallet);
      const paymentId = booking.paymentId.toString();
      const payment = await this._paymentRepository.findById(paymentId);
      const service = await this._serviceRepository.findById(booking.serviceId.toString());
      await this._walletRepository.createTransaction({
        walletId: wallet._id,
        transactionType: "credit",
        source: "refund",
        remarks: `Order ${payment.razorpay_order_id}`,
        amount: returAmount,
        status: TransactionStatus.REFUND,
        description: `Refund Received from ${service.title}`,
      });
      updatePayload.paymentStatus = PaymentStatus.REFUNDED;
    } else if (status === BookingStatus.COMPLETED) {
      const user = await this._userRepository.findById(userId);
      if (!user) {
        throw new CustomError("userId not found", HttpStatusCode.NOT_FOUND);
      }
      await this._bookingRepository.update(bookingId, updatePayload);
      const otp = generateOTP();
      bookingOtp = jwt.sign({ bookingId, otp }, process.env.JWT_SECRET, {
        expiresIn: "10m",
      });
      await sendBookingVerificationEmail(String(user.email), otp);
      return {
        message: `An OTP has been sent to Customers Email for verification, please verify that OTP`,
        completionToken: bookingOtp,
      };
    }
    await this._bookingRepository.update(bookingId, { status: status });

    return {
      message: `Booking ${status === BookingStatus.IN_PROGRESS ? "Started" : ""} ${status} Successfully`,
    };
  }

  async updateBookingDateTime(bookingId: string, date: string, time: string): Promise<void> {
    const booking = await this._bookingRepository.findById(bookingId);
    if (!booking) {
      throw new CustomError(ErrorMessage.BOOKING_NOT_FOUND, HttpStatusCode.NOT_FOUND);
    }
    if (booking.status !== BookingStatus.PENDING) {
      throw new CustomError("You can only udpate Date/Time on Pending", HttpStatusCode.BAD_REQUEST);
    }
    await this._bookingRepository.update(bookingId, {
      scheduledDate: date,
      scheduledTime: time,
    });
  }

  public async verifyOtp(data: VerifyOtpRequestBody, bookingToken: string): Promise<void> {
    const { email, otp } = data;

    const user = await this._userRepository.findByEmail(email, true);

    if (!user) {
      throw new CustomError(ErrorMessage.USER_NOT_FOUND, HttpStatusCode.NOT_FOUND);
    }

    try {
      const decoded = jwt.verify(bookingToken, process.env.JWT_SECRET as string) as BookingOtpPayload;
      if (!decoded) {
        throw new CustomError(`OTP ${ErrorMessage.TOKEN_EXPIRED}`, HttpStatusCode.FORBIDDEN);
      }
      if (otp !== decoded.otp) {
        throw new CustomError(ErrorMessage.INVALID_OTP, HttpStatusCode.BAD_REQUEST);
      }
      const booking = await this._bookingRepository.findById(decoded.bookingId);
      if (!booking) {
        throw new CustomError(ErrorMessage.BOOKING_NOT_FOUND, HttpStatusCode.NOT_FOUND);
      }
      booking.status = BookingStatus.COMPLETED;
      await this._bookingRepository.update(booking._id.toString(), booking);

      const [provider, payment, service] = await Promise.all([
        this._providerRepository.findOne({ userId: user._id.toString() }),
        this._paymentRepository.findById(booking.paymentId.toString()),
        this._serviceRepository.findById(booking.serviceId.toString()),
      ]);

      const wallet = await this._walletRepository.findOne({
        ownerId: user._id.toString(),
      });
      if (!wallet) {
        await this._walletRepository.create({
          balance: payment.providerAmount,
          ownerId: user._id as Types.ObjectId,
          ownerType: Roles.PROVIDER,
        });
      } else {
        wallet.balance += payment.providerAmount;
        provider.earnings += payment.providerAmount;
        provider.totalBookings += 1;
      }
      await this._walletRepository.createTransaction({
        walletId: wallet._id,
        transactionType: "credit",
        source: "payment",
        remarks: `Order ${payment.razorpay_order_id}`,
        amount: payment.providerAmount,
        status: TransactionStatus.PAYMENT,
        description: `Payment Received from ${service.title}`,
      });

      await this._providerRepository.update(provider._id.toString(), provider);
    } catch {
      throw new CustomError(ErrorMessage.OTP_VERIFICATION_FAILED, HttpStatusCode.FORBIDDEN);
    }
  }

  public async resendOtp(
    data: ResendOtpRequestBody,
    userId?: string,
  ): Promise<{ message: string; newCompletionToken?: string }> {
    const { email } = data;
    const user = await this._userRepository.findByEmail(email, true);

    if (!user) {
      throw new CustomError(ErrorMessage.USER_NOT_FOUND, HttpStatusCode.NOT_FOUND);
    }

    const newOtp = generateOTP();
    const newBookingOtp = jwt.sign({ userId, newOtp }, process.env.JWT_SECRET, {
      expiresIn: "10m",
    });

    await sendVerificationEmail(email, newOtp);

    return {
      message: "A new OTP has been sent to your email.",
      newCompletionToken: newBookingOtp,
    };
  }

  public async getAllBookingsForAdmin(
    page: number,
    limit: number,
    filters: { search?: string; bookingStatus?: string; dateRange?: string },
  ): Promise<IAdminBookingsResponse> {
    const bookingFilter: FilterQuery<IBooking> = {};

    if (filters.search) {
      const searchRegex = { $regex: filters.search, $options: "i" };

      const [matchedUsers, matchedProviders] = await Promise.all([
        this._userRepository.findAll({ name: searchRegex }),
        this._providerRepository.findAll({ fullName: searchRegex }),
      ]);

      const userIds = matchedUsers.map((u) => u._id);
      const providerIds = matchedProviders.map((p) => p._id);

      bookingFilter.$or = [{ userId: { $in: userIds } }, { providerId: { $in: providerIds } }];
    }

    if (filters.bookingStatus && filters.bookingStatus !== "All") {
      bookingFilter.status = filters.bookingStatus;
    }

    if (filters.dateRange && filters.dateRange !== "All") {
      const now = new Date();
      let startDate: Date;
      let endDate: Date;

      switch (filters.dateRange) {
        case "All":
          startDate = startOfDay(now);
          endDate = endOfDay(now);
          break;
        case "Last 7 Days":
          startDate = startOfWeek(now);
          endDate = endOfWeek(now);
          break;
        case "Last 30 Days":
          startDate = startOfMonth(now);
          endDate = endOfMonth(now);
          break;
        default:
          break;
      }

      if (startDate && endDate) {
        bookingFilter.createdAt = {
          $gte: startDate,
          $lte: endDate,
        };
      }
    }

    const allBookings = await this._bookingRepository.findAll(bookingFilter, {
      createdAt: -1,
    });

    const totalBookings = allBookings.length;
    const paginatedBookings = allBookings.slice((page - 1) * limit, page * limit);

    const userIds = [...new Set(paginatedBookings.map((b) => b.userId?.toString()).filter(Boolean))];
    const providerIds = [...new Set(paginatedBookings.map((b) => b.providerId?.toString()).filter(Boolean))];
    const serviceIds = [...new Set(paginatedBookings.map((b) => b.serviceId?.toString()).filter(Boolean))];

    const [users, providers, services] = await Promise.all([
      this._userRepository.findAll({ _id: { $in: userIds } }),
      this._providerRepository.findAll({ _id: { $in: providerIds } }),
      this._serviceRepository.findAll({ _id: { $in: serviceIds } }),
    ]);

    const userMap = new Map(users.map((u) => [u.id, u]));
    const providerMap = new Map(providers.map((p) => [p.id, p]));
    const serviceMap = new Map(services.map((s) => [s.id, s]));

    const bookings: IBookingLog[] = paginatedBookings.map((booking) => {
      const user = userMap.get(booking.userId?.toString());
      const provider = providerMap.get(booking.providerId?.toString());
      const service = serviceMap.get(booking.serviceId?.toString());

      return {
        id: booking._id.toString(),
        userName: (user?.name as string) || "N/A",
        userAvatar: user?.profilePicture ? getSignedUrl(user?.profilePicture as string) : null,
        providerName: (provider?.fullName as string) || "N/A",
        serviceType: (service?.title as string) || "N/A",
        dateTime: `${booking.scheduledDate || ""} ${booking.scheduledTime || ""}`.trim(),
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

  public async findProviderRange(
    userId: string,
    userRole: Roles,
    serviceId: string,
    lat: number,
    lng: number,
    radius: number,
  ): Promise<boolean> {
    const services = await this._serviceRepository.findAll({
      subCategoryId: serviceId,
    });
    if (!services || services.length <= 0) {
      throw new CustomError("Currently no service available", HttpStatusCode.NOT_FOUND);
    }
    let currentProviderId: string | null = null;
    if (userRole === Roles.PROVIDER) {
      const currentProvider = await this._providerRepository.findOne({
        userId,
      });
      if (currentProvider) {
        currentProviderId = currentProvider._id.toString();
      }
    }
    const providerids = services.map((s) => s.providerId.toString()).filter((id) => id !== currentProviderId);
    const providers = await this._providerRepository.findAll({
      _id: { $in: providerids },
    });
    return isProviderInRange(providers, lat, lng, radius);
  }

  public async createBookingFromBot(data: IBookingRequest): Promise<IBooking> {
    const booking = await this._bookingRepository.create({
      ...data,
      status: BookingStatus.PENDING,
      paymentStatus: PaymentStatus.UNPAID,
      bookingDate: new Date(),
    });
    return booking;
  }

  public async getBookingDetailsForAdmin(bookingId: string): Promise<IBookingDetailData> {
    const booking = await this._bookingRepository.findById(bookingId);
    if (!booking) throw new CustomError("Booking not found", HttpStatusCode.NOT_FOUND);

    const [user, provider, service, address, payment] = await Promise.all([
      this._userRepository.findById(booking.userId?.toString() || ""),
      this._providerRepository.findById(booking.providerId?.toString() || ""),
      this._serviceRepository.findById(booking.serviceId?.toString() || ""),
      this._addressRepository.findById(booking.addressId?.toString() || ""),
      booking.paymentId ? this._paymentRepository.findById(booking.paymentId.toString()) : null,
    ]);

    return {
      booking: {
        _id: booking._id.toString(),
        status: booking.status as BookingStatus,
        paymentStatus: booking.paymentStatus as PaymentStatus,
        amount: booking.amount as string,
        date: booking.scheduledDate as string,
        time: booking.scheduledTime as string,
        createdAt: new Date(booking.createdAt as string | Date).toISOString(),
        instructions: booking.instructions as string,
      },
      user: user
        ? {
            name: user.name as string,
            email: user.email as string,
            phone: user.phone as string,
            image: user.profilePicture ? getSignedUrl(user.profilePicture as string) : "",
          }
        : null,
      provider: provider
        ? {
            _id: provider._id.toString(),
            name: provider.fullName as string,
            email: provider.email as string,
            phone: provider.phoneNumber as string,
            image: provider.profilePhoto ? getSignedUrl(provider.profilePhoto) : "",
            serviceArea: provider.serviceArea as string,
          }
        : null,
      service: service
        ? {
            title: service.title as string,
            duration: service.duration as string,
            price: service.price as number,
          }
        : null,
      address: address
        ? {
            label: address.label,
            fullAddress: `${address.street}, ${address.city}, ${address.state} - ${address.zip}`,
          }
        : null,
      payment: payment
        ? {
            method: payment.paymentMethod as PaymentMethod,
            transactionId: (payment.razorpay_payment_id || payment._id.toString()) as string,
            date: new Date(payment.paymentDate).toISOString(),
          }
        : null,
    };
  }

  async refundPayment(
    paymentId: string,
    amount: number,
    userId: string,
  ): Promise<{ refundId: string; message: string }> {
    try {
      const refund = await initiateRefund(paymentId, amount);

      const userWallet = await this._walletRepository.findOne({ ownerId: userId });

      if (userWallet) {
        await this._walletRepository.createTransaction({
          walletId: userWallet._id,
          transactionType: "credit",
          source: "Razorpay (Refund)",
          amount: amount,
          description: "Refund for booking slot conflict",
          remarks: `Refund ID: ${refund.id}`,
          status: TransactionStatus.REFUND,
        });
      }

      return {
        refundId: refund.id,
        message: "Refund initiated successfully",
      };
    } catch (error) {
      console.error("Refund failed:", error);
      throw new CustomError("Failed to process refund", HttpStatusCode.INTERNAL_SERVER_ERROR);
    }
  }

  private async _calculateParentCommissionInternal(amount: number, subCategory: ICategory): Promise<number> {
    if (!subCategory.parentId) return 0;

    const parentCategory = await this._categoryRepository.findById(subCategory.parentId.toString());
    if (!parentCategory) return 0;

    const parentCommission = await this._commissionRuleRepository.findOne({
      categoryId: parentCategory._id.toString(),
    });

    return calculateCommission(amount, parentCommission);
  }
}
