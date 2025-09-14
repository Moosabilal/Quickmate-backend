import { injectable } from "inversify";
import { IAddressRepository } from "../interface/IAddressRepository";
import { Address, IAddress } from "../../models/address";
import { IAddressRequest } from "../../interface/address..dto";
import { BaseRepository } from "./base/BaseRepository";


@injectable()
export class AddressRepository extends BaseRepository<IAddress> implements IAddressRepository {

    constructor() {
        super(Address)
    }

}