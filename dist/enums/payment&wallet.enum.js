"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionStatus = void 0;
var TransactionStatus;
(function (TransactionStatus) {
    TransactionStatus["ALL"] = "All";
    TransactionStatus["REFUND"] = "Refund";
    TransactionStatus["DEPOSIT"] = "Deposit";
    TransactionStatus["WITHDRAWN"] = "Withdrawn";
    TransactionStatus["PAYMENT"] = "Payment";
})(TransactionStatus || (exports.TransactionStatus = TransactionStatus = {}));
