import { type IAddAndEditServiceForm, type IProviderServicePageResponse } from "../../interface/service.js";

export interface IServiceService {
  addService(serviceData: IAddAndEditServiceForm): Promise<{ message: string; success: boolean }>;
  getProviderServices(providerId: string): Promise<{ services: IProviderServicePageResponse[] }>;
  getServiceById(id: string): Promise<IAddAndEditServiceForm>;
  updateService(
    id: string,
    serviceData: Partial<IAddAndEditServiceForm>,
  ): Promise<{ message: string; success: boolean }>;
  deleteService(id: string): Promise<{ message: string }>;
}
