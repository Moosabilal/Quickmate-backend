import { IAddress } from "../../models/address";
import { IAddressRequest } from "../../dto/address..dto";
export interface IAddressService {
    addAddress(data: Partial<IAddress>): Promise<IAddressRequest>;
    getAllAddress(userId: string): Promise<IAddressRequest[]>;
    updateAddressById(id: string, data: IAddressRequest): Promise<IAddressRequest>;
    delete_Address(id: string): Promise<{message: string}>;
}