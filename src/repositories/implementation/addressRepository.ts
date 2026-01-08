import { injectable } from "inversify";
import { type IAddressRepository } from "../interface/IAddressRepository";
import { Address, type IAddress } from "../../models/address";
import { BaseRepository } from "./base/BaseRepository";

@injectable()
export class AddressRepository extends BaseRepository<IAddress> implements IAddressRepository {
  constructor() {
    super(Address);
  }
}
