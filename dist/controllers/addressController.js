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
exports.AddressController = void 0;
const inversify_1 = require("inversify");
const type_1 = __importDefault(require("../di/type"));
const HttpStatusCode_1 = require("../enums/HttpStatusCode");
const address_validation_1 = require("../utils/validations/address.validation");
(0, inversify_1.injectable)();
let AddressController = class AddressController {
    constructor(addressService) {
        this.createAddress = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            try {
                const validatedBody = address_validation_1.createAddressSchema.parse(req.body);
                const userId = req.user.id;
                const updatedAddress = yield this._addressService.addAddress(userId, validatedBody);
                res.status(HttpStatusCode_1.HttpStatusCode.OK).json(updatedAddress);
            }
            catch (error) {
                next(error);
            }
        });
        this.getAddress = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            try {
                const userId = req.user.id;
                const address = yield this._addressService.getAllAddress(userId);
                res.status(HttpStatusCode_1.HttpStatusCode.OK).json(address);
            }
            catch (error) {
                next(error);
            }
        });
        this.updateAddress = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = address_validation_1.mongoIdSchema.parse(req.params);
                const validatedBody = address_validation_1.updateAddressSchema.parse(req.body);
                const updateData = Object.assign({}, validatedBody);
                const locationString = validatedBody.locationCoords;
                if (validatedBody.locationCoords) {
                    const [lat, lon] = validatedBody.locationCoords.split(",").map(Number);
                    updateData.locationCoords = { type: "Point", coordinates: [lon, lat] };
                }
                const updateAddress = yield this._addressService.updateAddressById(id, updateData);
                res.status(HttpStatusCode_1.HttpStatusCode.OK).json(updateAddress);
            }
            catch (error) {
                next(error);
            }
        });
        this.deleteAddress = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = address_validation_1.mongoIdSchema.parse(req.params);
                const response = yield this._addressService.delete_Address(id);
                res.status(HttpStatusCode_1.HttpStatusCode.OK).json(response);
            }
            catch (error) {
                next(error);
            }
        });
        this._addressService = addressService;
    }
};
exports.AddressController = AddressController;
exports.AddressController = AddressController = __decorate([
    __param(0, (0, inversify_1.inject)(type_1.default.AddressService)),
    __metadata("design:paramtypes", [Object])
], AddressController);
