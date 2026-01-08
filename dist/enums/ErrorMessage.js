export var ErrorMessage;
(function (ErrorMessage) {
    ErrorMessage["USER_NOT_FOUND"] = "User not found.";
    ErrorMessage["USER_ALREADY_EXISTS"] = "User with this email already exists";
    ErrorMessage["INVALID_CREDENTIALS"] = "Invalid credentials.";
    ErrorMessage["UNAUTHORIZED_ACCESS"] = "You are not authorized to perform this action.";
    ErrorMessage["RESOURCE_CONFLICT"] = "Resource already exists.";
    ErrorMessage["INTERNAL_ERROR"] = "Something went wrong. Please try again later.";
    //token errors
    ErrorMessage["TOKEN_EXPIRED"] = "Token has expired.";
    ErrorMessage["INVALID_TOKEN"] = "Invalid token.";
    ErrorMessage["MISSING_TOKEN"] = "Authorization token is missing. Please re-login";
    ErrorMessage["INVALID_REFRESH_TOKEN"] = "Refresh token invalid or expired. Please re-login.";
    //provider errors
    ErrorMessage["PROVIDER_NOT_FOUND"] = "Provider not found";
    //otp
    ErrorMessage["INVALID_OTP"] = "Invalid OTP!, Please Enter the Correct OTP.";
    ErrorMessage["OTP_VERIFICATION_FAILED"] = "OTP Verification Failed. Please try again later.";
    //booking errors
    ErrorMessage["BOOKING_NOT_FOUND"] = "Booking not found.";
    ErrorMessage["BOOKING_CANNOT_BE_CANCELLED"] = "Booking cannot be cancelled at this stage.";
    ErrorMessage["BOOKING_IS_ALREADY_CANCELLED"] = "Booking is already cancelled.";
    ErrorMessage["BOOKING_CANCELLED_SUCCESSFULLY"] = "Booking cancelled successfully.";
    //subscriptionPlan errors
    ErrorMessage["PLAN_ALREADY_EXITS"] = "This named plan already exist, Please provide another name";
    ErrorMessage["NO_PLANS"] = "No subscription Plan created";
    ErrorMessage["PLAN_NOT_FOUND"] = "Subscription Plan not found";
})(ErrorMessage || (ErrorMessage = {}));
