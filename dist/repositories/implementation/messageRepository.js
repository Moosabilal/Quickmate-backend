"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageRepository = void 0;
const message_1 = __importDefault(require("../../models/message"));
const BaseRepository_1 = require("./base/BaseRepository");
class MessageRepository extends BaseRepository_1.BaseRepository {
    constructor() {
        super(message_1.default);
    }
    findAllSorted(joiningId) {
        return __awaiter(this, void 0, void 0, function* () {
            const data = message_1.default.find({ joiningId })
                .sort({ createdAt: 1 })
                .lean();
            return data;
        });
    }
    findLastMessagesByJoiningIds(joiningIds) {
        return __awaiter(this, void 0, void 0, function* () {
            const aggregation = yield this.model.aggregate([
                { $match: { joiningId: { $in: joiningIds } } },
                { $sort: { createdAt: -1 } },
                {
                    $group: {
                        _id: "$joiningId",
                        lastMessageDoc: { $first: "$$ROOT" }
                    }
                },
                {
                    $project: {
                        _id: 0,
                        joiningId: "$_id",
                        createdAt: "$lastMessageDoc.createdAt",
                        messageType: "$lastMessageDoc.messageType",
                        lastMessage: "$lastMessageDoc.text",
                        senderId: "$lastMessageDoc.senderId"
                    }
                }
            ]);
            return aggregation;
        });
    }
}
exports.MessageRepository = MessageRepository;
