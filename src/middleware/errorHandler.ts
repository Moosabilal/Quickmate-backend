import { Request, Response, NextFunction } from "express";

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {

    const statusCode = err.statusCode || 500
    const message = err.message || 'Internal server error'

    console.error(`[Error] ${req.method} ${req.url} ${statusCode} ${message} ->`, err)

    res.status(statusCode).json({
        success: false,
        message,
    })

}