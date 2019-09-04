import express from "express";
import log = require("loglevel");

export function loggingRoute(req: express.Request, res: express.Response, next: express.NextFunction): void {
    let statusCode: number;

    const originalStatus = res.status;
    res.status = code => {
        statusCode = code;
        return originalStatus.call(res, code);
    };

    const originalSend = res.send;
    res.send = body => {
        log.info(req.method, req.path, statusCode, body);
        return originalSend.call(res, body);
    };

    return next();
}
