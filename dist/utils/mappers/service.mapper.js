"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toProviderServicePage = toProviderServicePage;
exports.toServiceEditPage = toServiceEditPage;
function toProviderServicePage(services, categoryMap, subCategoryMap, reviewMap) {
    return services.map(service => {
        var _a, _b;
        const reviewData = reviewMap.get(service.id.toString()) || { avgRating: 0, reviewCount: 0 };
        return {
            id: service.id,
            category: categoryMap.get(service.categoryId.toString()) || '',
            title: ((_a = subCategoryMap.get(service.subCategoryId.toString())) === null || _a === void 0 ? void 0 : _a.name) || '',
            serviceImage: ((_b = subCategoryMap.get(service.subCategoryId.toString())) === null || _b === void 0 ? void 0 : _b.iconUrl) || '',
            description: service.description,
            price: service.price,
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
        businessCertification: service.businessCertification
    };
}
