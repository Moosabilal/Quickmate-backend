export var Roles;
(function (Roles) {
    Roles["USER"] = "Customer";
    Roles["PROVIDER"] = "ServiceProvider";
    Roles["ADMIN"] = "Admin";
})(Roles || (Roles = {}));
export var PaymentMethod;
(function (PaymentMethod) {
    PaymentMethod["CARD"] = "Card";
    PaymentMethod["WALLET"] = "Wallet";
    PaymentMethod["UPI"] = "UPI";
    PaymentMethod["BANK"] = "Bank";
})(PaymentMethod || (PaymentMethod = {}));
export var PaymentStatus;
(function (PaymentStatus) {
    PaymentStatus["PAID"] = "Paid";
    PaymentStatus["UNPAID"] = "UnPaid";
    PaymentStatus["REFUNDED"] = "Refunded";
})(PaymentStatus || (PaymentStatus = {}));
