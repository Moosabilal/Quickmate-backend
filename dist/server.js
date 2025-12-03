"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const helmet_1 = __importDefault(require("helmet"));
const dotenv_1 = __importDefault(require("dotenv"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
dotenv_1.default.config();
const database_1 = __importDefault(require("./config/database"));
const path_1 = __importDefault(require("path"));
const auth_1 = __importDefault(require("./routes/auth"));
const adminRoutes_1 = __importDefault(require("./routes/adminRoutes"));
const categoryRoutes_1 = __importDefault(require("./routes/categoryRoutes"));
const providerRoute_1 = __importDefault(require("./routes/providerRoute"));
const address_1 = __importDefault(require("./routes/address"));
const bookingRoutes_1 = __importDefault(require("./routes/bookingRoutes"));
const serviceRoutes_1 = __importDefault(require("./routes/serviceRoutes"));
const walletRoutes_1 = __importDefault(require("./routes/walletRoutes"));
const reviewRoutes_1 = __importDefault(require("./routes/reviewRoutes"));
const subscriptionRoutes_1 = __importDefault(require("./routes/subscriptionRoutes"));
const messageRoutes_1 = __importDefault(require("./routes/messageRoutes"));
const chatBotRoutes_1 = __importDefault(require("./routes/chatBotRoutes"));
const fs_1 = __importDefault(require("fs"));
const CustomError_1 = require("./utils/CustomError");
const errorHandler_1 = require("./middleware/errorHandler");
const logger_1 = __importDefault(require("./logger/logger"));
const socket_1 = require("./utils/socket");
const cleanupProviderSchedule_1 = require("./jobs/cleanupProviderSchedule");
const uploadDir = path_1.default.join(__dirname, '../uploads');
if (!fs_1.default.existsSync(uploadDir)) {
    fs_1.default.mkdirSync(uploadDir);
}
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
//database
(0, database_1.default)();
// Middleware
app.use((0, cors_1.default)({
    origin: "http://localhost:5173",
    credentials: true,
}));
app.use((0, helmet_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, cookie_parser_1.default)());
// app.use(rateLimiter);
app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, '..', 'uploads')));
app.use('/api/auth', auth_1.default);
app.use('/api/admin', adminRoutes_1.default);
app.use('/api/provider', providerRoute_1.default);
app.use('/api/categories', categoryRoutes_1.default);
app.use('/api/address', address_1.default);
app.use('/api/bookings', bookingRoutes_1.default);
app.use('/api/services', serviceRoutes_1.default);
app.use('/api/wallet', walletRoutes_1.default);
app.use('/api/review', reviewRoutes_1.default);
app.use('/api/subscriptionPlan', subscriptionRoutes_1.default);
app.use('/api/messages', messageRoutes_1.default);
app.use('/api/chatbot', chatBotRoutes_1.default);
app.use((req, res, next) => {
    const error = new CustomError_1.CustomError(`Not Found - ${req.originalUrl}`, 404);
    next(error);
});
app.use(errorHandler_1.errorHandler);
const server = http_1.default.createServer(app);
const io = new socket_io_1.Server(server, {
    cors: {
        origin: "http://localhost:5173",
        methods: ["GET", "POST"],
        credentials: true
    }
});
(0, socket_1.chatSocket)(io);
(0, cleanupProviderSchedule_1.startScheduleCleanupJob)();
server.listen(PORT, () => logger_1.default.info(`Server running on port ${PORT}`));
