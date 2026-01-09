import { injectable } from "inversify";
import { type IAddressRepository } from "../interface/IAddressRepository.js";
import { Address, type IAddress } from "../../models/address.js";
import { BaseRepository } from "./base/BaseRepository.js";

@injectable()
export class AddressRepository extends BaseRepository<IAddress> implements IAddressRepository {
  constructor() {
    super(Address);
  }
}
