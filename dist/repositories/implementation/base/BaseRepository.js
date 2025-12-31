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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseRepository = void 0;
const mongoose_1 = require("mongoose");
const inversify_1 = require("inversify");
let BaseRepository = class BaseRepository {
    constructor(model) {
        this.model = model;
    }
    create(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const created = new this.model(data);
            return yield created.save();
        });
    }
    findById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.model.findById(id);
        });
    }
    findOne(filter) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.model.findOne(filter);
        });
    }
    findAll() {
        return __awaiter(this, arguments, void 0, function* (filter = {}, sort = {}) {
            return yield this.model.find(filter).sort(sort);
        });
    }
    update(id_1, updateData_1) {
        return __awaiter(this, arguments, void 0, function* (id, updateData, options = {}) {
            const updateOptions = Object.assign({ new: true }, options);
            return yield this.model.findByIdAndUpdate(id, updateData, updateOptions);
        });
    }
    delete(id) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.model.findByIdAndDelete(id);
        });
    }
    count() {
        return __awaiter(this, arguments, void 0, function* (filter = {}) {
            return yield this.model.countDocuments(filter);
        });
    }
};
exports.BaseRepository = BaseRepository;
exports.BaseRepository = BaseRepository = __decorate([
    (0, inversify_1.injectable)(),
    __metadata("design:paramtypes", [mongoose_1.Model])
], BaseRepository);
