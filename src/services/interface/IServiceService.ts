import { IAddAndEditServiceForm } from "../../dto/service.dto";

export interface IServiceService {
    addService(serviceData: IAddAndEditServiceForm): Promise<{message: string}>;
}