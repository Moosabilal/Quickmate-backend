import { IAddress } from "../../models/address";
import { IAddressRequest } from "../../dto/address..dto";
import { IBaseRepository } from "./base/IBaseRepository";
export interface IAddressRepository extends IBaseRepository<IAddress> {

}