import { getSignedUrl } from "../cloudinaryUpload";
export function toProviderServicePage(services, categoryMap, subCategoryMap, reviewMap) {
    return services.map((service) => {
        const s = service.toObject ? service.toObject() : service;
        const sId = s._id.toString();
        const reviewData = reviewMap.get(sId) || { avgRating: 0, reviewCount: 0 };
        const subCatData = subCategoryMap.get(s.subCategoryId.toString());
        return {
            id: sId,
            category: categoryMap.get(s.categoryId.toString()) || "",
            title: subCatData?.name || s.title || "",
            serviceImage: subCatData?.iconUrl ? getSignedUrl(subCatData.iconUrl) : "",
            description: s.description || "",
            price: s.price,
            rating: reviewData.avgRating,
            reviews: reviewData.reviewCount,
        };
    });
}
export function toServiceEditPage(service, category) {
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
        businessCertification: service.businessCertification ? getSignedUrl(service.businessCertification) : "",
    };
}
