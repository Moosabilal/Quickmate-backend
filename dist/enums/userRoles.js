"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentStatus = exports.PaymentMethod = exports.Roles = void 0;
var Roles;
(function (Roles) {
    Roles["USER"] = "Customer";
    Roles["PROVIDER"] = "ServiceProvider";
    Roles["ADMIN"] = "Admin";
})(Roles || (exports.Roles = Roles = {}));
var PaymentMethod;
(function (PaymentMethod) {
    PaymentMethod["CARD"] = "Card";
    PaymentMethod["WALLET"] = "Wallet";
    PaymentMethod["UPI"] = "UPI";
    PaymentMethod["BANK"] = "Bank";
})(PaymentMethod || (exports.PaymentMethod = PaymentMethod = {}));
var PaymentStatus;
(function (PaymentStatus) {
    PaymentStatus["PAID"] = "Paid";
    PaymentStatus["UNPAID"] = "UnPaid";
    PaymentStatus["REFUNDED"] = "Refunded";
})(PaymentStatus || (exports.PaymentStatus = PaymentStatus = {}));
