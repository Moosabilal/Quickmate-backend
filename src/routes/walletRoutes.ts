import expres from 'express'
import TYPES from '../di/type'
import { WalletController } from '../controllers/walletController'
import { container } from '../di/container'

const router = expres.Router()
const walletController = container.get<WalletController>(TYPES.WalletController)


export default router