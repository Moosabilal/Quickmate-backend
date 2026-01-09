import { type IAddress } from "../../models/address.js";
import { type IAddressRequest } from "../../interface/address.js";
export interface IAddressService {
  addAddress(userId: string, data: Partial<IAddressRequest>): Promise<IAddressRequest>;
  getAllAddress(userId: string): Promise<IAddressRequest[]>;
  updateAddressById(id: string, data: IAddressRequest): Promise<IAddressRequest>;
  delete_Address(id: string): Promise<{ message: string }>;
  getAddressesForUser(userId: string): Promise<IAddress[]>;
}
