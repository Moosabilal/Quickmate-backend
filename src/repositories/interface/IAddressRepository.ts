import { type IAddress } from "../../models/address.js";
import { type IBaseRepository } from "./base/IBaseRepository.js";
// export interface IAddressRepository extends IBaseRepository<IAddress> {}
export type IAddressRepository = IBaseRepository<IAddress>;
