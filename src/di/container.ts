import 'reflect-metadata';
import { Container } from 'inversify';
import { AuthController } from '../controllers/authController';
import { AuthService } from '../services/implementation/authService';
import { IAuthService } from '../services/interface/IAuthService';
import { UserRepository } from '../repositories/implementation/userRepositories';
import { IUserRepository } from '../repositories/interface/IUserRepository';
import TYPES from './type';
import { CategoryController } from '../controllers/categoryController';
import { ICategoryService } from '../services/interface/ICategoryService';
import { CategoryService } from '../services/implementation/categoryService';
import { ICategoryRepository } from '../repositories/interface/ICategoryRepository';
import { CategoryRepository } from '../repositories/implementation/categoryRepository';
import { ICommissionRuleRepository } from '../repositories/interface/ICommissonRuleRepository';
import { CommissionRuleRepository } from '../repositories/implementation/commissionRuleRepository';
import { IProviderService } from '../services/interface/IProviderService';
import { ProviderController } from '../controllers/providerController';
import { ProviderService } from '../services/implementation/providerService';
import { IProviderRepository } from '../repositories/interface/IProviderRepository';
import { ProviderRepository } from '../repositories/implementation/providerRepository';

const container = new Container()
container.bind<AuthController>(TYPES.AuthController).to(AuthController)
container.bind<IAuthService>(TYPES.AuthService).to(AuthService)
container.bind<IUserRepository>(TYPES.UserRepository).to(UserRepository)

container.bind<CategoryController>(TYPES.CategoryController).to(CategoryController)
container.bind<ICategoryService>(TYPES.CategoryService).to(CategoryService)
container.bind<ICategoryRepository>(TYPES.CategoryRepository).to(CategoryRepository)
container.bind<ICommissionRuleRepository>(TYPES.CommissionRuleRepository).to(CommissionRuleRepository)

container.bind<ProviderController>(TYPES.ProviderController).to(ProviderController)
container.bind<IProviderService>(TYPES.ProviderService).to(ProviderService)
container.bind<IProviderRepository>(TYPES.ProviderRepository).to(ProviderRepository)

export {container}