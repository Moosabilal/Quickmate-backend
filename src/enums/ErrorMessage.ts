export enum ErrorMessage {
  USER_NOT_FOUND = "User not found.",
  USER_ALREADY_EXISTS = "User with this email already exists",
  INVALID_CREDENTIALS = "Invalid credentials.",
  UNAUTHORIZED_ACCESS = "You are not authorized to perform this action.",
  RESOURCE_CONFLICT = "Resource already exists.",
  INTERNAL_ERROR = "Something went wrong. Please try again later.",

  //token errors
  TOKEN_EXPIRED = "Token has expired.",
  INVALID_TOKEN = "Invalid token.",
  MISSING_TOKEN = "Authorization token is missing. Please re-login",
  INVALID_REFRESH_TOKEN = "Refresh token invalid or expired. Please re-login.",

  //provider errors
  PROVIDER_NOT_FOUND = "Provider not found",

  //otp
  INVALID_OTP = "Invalid OTP!, Please Enter the Correct OTP.",
  OTP_VERIFICATION_FAILED = "OTP Verification Failed. Please try again later.",

  //booking errors
  BOOKING_NOT_FOUND = "Booking not found.",
  BOOKING_CANNOT_BE_CANCELLED = "Booking cannot be cancelled at this stage.",
  BOOKING_IS_ALREADY_CANCELLED = "Booking is already cancelled.",
  BOOKING_CANCELLED_SUCCESSFULLY = "Booking cancelled successfully.",

  //subscriptionPlan errors
  PLAN_ALREADY_EXITS = "This named plan already exist, Please provide another name",
  NO_PLANS = "No subscription Plan created",
  PLAN_NOT_FOUND = "Subscription Plan not found",
}
