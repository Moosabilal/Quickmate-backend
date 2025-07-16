import { Provider, IProvider } from "../../models/Providers";
import User from "../../models/User";
import { IProviderRepository } from "../interface/IProviderRepository";


export class ProviderRepository implements IProviderRepository {
    async createProvider(data: Partial<IProvider>): Promise<IProvider> {
        const provider = new Provider(data);
        await provider.save();
        if (data.userId) {
            const updatedUser = await User.findByIdAndUpdate(
                data.userId,
                { role: 'ServiceProvider' },
                { new: true }
            );

            if (!updatedUser) {
                throw new Error('User not found while updating role.');
            }
        }

        return provider;

    }

    async getAllProviders(): Promise<IProvider[]> {
    return Provider.find();
  }
}