import { type IProvider } from "../../models/Providers.js";
import {
  type IProviderFilter,
  type IProviderRegistrationData,
  type ITopActiveProviders,
  type ProviderFilterQuery,
} from "../../interface/provider.js";
import { type IBaseRepository } from "./base/IBaseRepository.js";

export interface IProviderRepository extends IBaseRepository<IProvider> {
  createProvider(data: IProviderRegistrationData): Promise<IProvider>;
  findByEmail(email: string, includeOtpFields?: boolean): Promise<IProvider>;
  getAllProviders(): Promise<IProvider[]>;
  findProvidersWithFilter(filter: IProviderFilter): Promise<IProvider[]>;
  countProviders(filter: IProviderFilter): Promise<number>;
  getProviderByUserId(userId: string): Promise<IProvider | null>;
  updateProvider(updateData: Partial<IProviderRegistrationData>): Promise<IProvider | null>;
  updateStatusById(id: string, newStatus: string): Promise<void>;
  getProviderByServiceId(filterQuery: ProviderFilterQuery): Promise<IProvider[]>;
  getProviderId(userId: string): Promise<string>;
  getTopActiveProviders(): Promise<ITopActiveProviders[]>;
  findFilteredProviders(criteria: {
    providerIds: string[];
    userIdToExclude: string;
    lat?: number;
    long?: number;
    radius?: number;
    date?: string;
    time?: string;
  }): Promise<IProvider[]>;
  getTopProvidersByEarnings(limit?: number): Promise<{ name: string; earnings: number }[]>;
  findProvidersByIdsAndSearch(providerIds: string[], search?: string): Promise<IProvider[]>;
  removePastAvailability(cutoffDate: string): Promise<number>;
}
