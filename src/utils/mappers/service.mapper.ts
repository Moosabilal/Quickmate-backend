import { IAddAndEditServiceForm, IProviderServicePageResponse } from "../../interface/service";
import { ServicesPriceUnit } from "../../enums/Services.enum";
import { ICategory } from "../../models/Categories";
import { IService } from "../../models/Service";

export function toProviderServicePage(
    services: IService[],
    categoryMap: Map<string, string>,
    subCategoryMap: Map<string, { name: string, iconUrl: string }>
): IProviderServicePageResponse[] {
    return services.map((service) => ({
        id: service.id,
        category: categoryMap.get(service.categoryId.toString()) || '',
        title: subCategoryMap.get(service.subCategoryId.toString())?.name || '',
        serviceImage: subCategoryMap.get(service.subCategoryId.toString())?.iconUrl || '',
        description: service.description,
        price: service.price
    }));
}

export function toServiceEditPage(service: IService, category: ICategory): IAddAndEditServiceForm {
    return {
        id: service._id.toString(),
        title: category.name,
        description: service.description,
        experience: service.experience,
        categoryId: category.parentId.toString(),
        subCategoryId: category._id.toString(),
        duration: service.duration,
        priceUnit: service.priceUnit as ServicesPriceUnit,
        status: service.status,
        price: service.price,
        businessCertification: service.businessCertification


    }
}