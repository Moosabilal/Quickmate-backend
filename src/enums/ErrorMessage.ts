export enum ErrorMessage {
  USER_NOT_FOUND = "User not found.",
  USER_ALREADY_EXISTS = "User with this email already exists",
  INVALID_CREDENTIALS = "Invalid credentials.",
  UNAUTHORIZED_ACCESS = "You are not authorized to perform this action.",
  RESOURCE_CONFLICT = "Resource already exists.",
  INTERNAL_ERROR = "Something went wrong. Please try again later.",

  //token errors
  TOKEN_EXPIRED = 'Token has expired.',
  INVALID_TOKEN = 'Invalid token.',
  MISSING_TOKEN = 'Authorization token is missing. Please re-login',
  INVALID_REFRESH_TOKEN = 'Refresh token invalid or expired. Please re-login.',
}
