import { type IAddress } from "../../models/address";
import { type IBaseRepository } from "./base/IBaseRepository";
// export interface IAddressRepository extends IBaseRepository<IAddress> {}
export type IAddressRepository = IBaseRepository<IAddress>;
