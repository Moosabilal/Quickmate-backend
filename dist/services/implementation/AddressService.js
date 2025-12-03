"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
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
exports.AddressService = void 0;
const inversify_1 = require("inversify");
const type_1 = __importDefault(require("../../di/type"));
const address_mapper_1 = require("../../utils/mappers/address.mapper");
const address_rMapper_1 = require("../../utils/reverseMapper/address.rMapper");
const mongoose_1 = require("mongoose");
(0, inversify_1.injectable)();
let AddressService = class AddressService {
    constructor(addressRepsitory) {
        this._addressRepository = addressRepsitory;
    }
    addAddress(userId, data) {
        return __awaiter(this, void 0, void 0, function* () {
            const dataForDb = (0, address_rMapper_1.toAddressModel)(userId, data);
            const existingAddress = yield this._addressRepository.findOne({
                userId: dataForDb.userId,
                label: dataForDb.label,
                street: dataForDb.street,
                zip: dataForDb.zip,
            });
            if (existingAddress) {
                return (0, address_mapper_1.toAddressRequestDTO)(existingAddress);
            }
            const createdAddress = yield this._addressRepository.create(dataForDb);
            return (0, address_mapper_1.toAddressRequestDTO)(createdAddress);
        });
    }
    getAllAddress(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const allAddress = yield this._addressRepository.findAll({ userId: userId });
            return allAddress.filter((adr => adr.label !== "Current Location")).map((adr) => ({
                id: adr._id.toString(),
                userId: adr.userId.toString(),
                label: adr.label,
                street: adr.street,
                city: adr.city,
                state: adr.state,
                zip: adr.zip,
                locationCoords: `${adr.locationCoords.coordinates[1]},${adr.locationCoords.coordinates[0]}` || "",
            }));
        });
    }
    updateAddressById(id, data) {
        return __awaiter(this, void 0, void 0, function* () {
            const updatedAddress = yield this._addressRepository.update(id, data);
            return {
                id: updatedAddress._id.toString(),
                userId: updatedAddress.userId.toString(),
                label: updatedAddress.label,
                street: updatedAddress.street,
                city: updatedAddress.city,
                state: updatedAddress.state,
                zip: updatedAddress.zip,
                locationCoords: `${updatedAddress.locationCoords.coordinates[1]},${updatedAddress.locationCoords.coordinates[0]}` || "",
            };
        });
    }
    delete_Address(id) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this._addressRepository.delete(id);
            return {
                message: "Address Deleted"
            };
        });
    }
    getAddressesForUser(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._addressRepository.findAll({ userId: new mongoose_1.Types.ObjectId(userId), label: { $ne: "Current Location" } });
        });
    }
};
exports.AddressService = AddressService;
exports.AddressService = AddressService = __decorate([
    __param(0, (0, inversify_1.inject)(type_1.default.AddressRepository)),
    __metadata("design:paramtypes", [Object])
], AddressService);
