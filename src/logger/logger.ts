import { createLogger, format, transports } from "winston";
const customFormat = format.combine(format.printf((info) => {
    return `[${info.level.toUpperCase().padEnd(7)}] - ${info.message}`
}))
const logger = createLogger({
    format: customFormat,
    transports:[
        new transports.Console({ level: "silly"}),
        new transports.File({filename:"app.log" , level: "info"})
    ]
});

export default logger;