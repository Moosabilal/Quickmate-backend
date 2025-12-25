"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toProviderServicePage = toProviderServicePage;
exports.toServiceEditPage = toServiceEditPage;
const cloudinaryUpload_1 = require("../cloudinaryUpload");
function toProviderServicePage(services, categoryMap, subCategoryMap, reviewMap) {
    return services.map(service => {
        const s = service.toObject ? service.toObject() : service;
        const sId = s._id.toString();
        const reviewData = reviewMap.get(sId) || { avgRating: 0, reviewCount: 0 };
        const subCatData = subCategoryMap.get(s.subCategoryId.toString());
        return {
            id: sId,
            category: categoryMap.get(s.categoryId.toString()) || '',
            title: (subCatData === null || subCatData === void 0 ? void 0 : subCatData.name) || s.title || '',
            serviceImage: (subCatData === null || subCatData === void 0 ? void 0 : subCatData.iconUrl)
                ? (0, cloudinaryUpload_1.getSignedUrl)(subCatData.iconUrl)
                : '',
            description: s.description || '',
            price: s.price,
            rating: reviewData.avgRating,
            reviews: reviewData.reviewCount
        };
    });
}
function toServiceEditPage(service, category) {
    return {
        id: service._id.toString(),
        title: category.name,
        description: service.description,
        experience: service.experience,
        categoryId: category.parentId.toString(),
        subCategoryId: category._id.toString(),
        duration: service.duration,
        priceUnit: service.priceUnit,
        status: service.status,
        price: service.price,
        businessCertification: service.businessCertification ? (0, cloudinaryUpload_1.getSignedUrl)(service.businessCertification) : ''
    };
}
