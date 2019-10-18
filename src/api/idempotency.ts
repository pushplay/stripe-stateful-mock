import express from "express";
import deepEqual = require("deep-equal");
import log = require("loglevel");
import {generateId} from "./utils";
import {StripeError} from "./StripeError";
import {AccountData} from "./AccountData";
import {getRequestAccountId} from "../routes";

interface StoredRequest {
    id: string;
    created: number;
    requestId: string;
    requestBody: any;
    responseCode: number;
    responseBody: any;
}

const accountRequests = new AccountData<StoredRequest>();

export function idempotencyRoute(req: express.Request, res: express.Response, next: express.NextFunction): void {
    const idempotencyKey = req.header("idempotency-key");
    if (!idempotencyKey) {
        return next();
    }

    const accountId = getRequestAccountId(req);
    const storedRequestKey = `(${req.method})(${req.path})(${idempotencyKey})`;

    if (accountRequests.contains(accountId, storedRequestKey)) {
        const storedRequest = accountRequests.get(accountId, storedRequestKey);

        if (!deepEqual(storedRequest.requestBody, req.body)) {
            log.error("request body", req.body, "does not match stored body", storedRequest.requestBody);
            throw new StripeError(400, {
                message: `Keys for idempotent requests can only be used with the same parameters they were first used with. Try using a key other than '${idempotencyKey}' if you meant to execute a different request.`,
                type: "idempotency_error"
            });
        }

        log.debug("replaying idempotent request", storedRequest);
        res.status(storedRequest.responseCode)
            .set("original-request", storedRequest.requestId)
            .set("request-id", "req_" + generateId(14))
            .set("idempotent-replayed", "true")
            .send(storedRequest.responseBody);
        return;
    } else {
        const storedRequest: StoredRequest = {
            id: storedRequestKey,
            created: (Date.now() / 1000) | 0,
            requestId: "req_" + generateId(14),
            requestBody: req.body,
            responseCode: 0,
            responseBody: null
        };
        accountRequests.put(accountId, storedRequest);
        res.set("request-id", storedRequest.requestId);

        // Let's get real dirty.

        const originalStatus = res.status;
        res.status = code => {
            if (codeIsIdempotentCached(code) && accountRequests.contains(accountId, storedRequestKey)) {
                accountRequests.get(accountId, storedRequestKey).responseCode = code;
            } else {
                accountRequests.remove(accountId, storedRequestKey);
            }
            return originalStatus.call(res, code);
        };

        const originalSend = res.send;
        res.send = body => {
            if (accountRequests.contains(accountId, storedRequestKey)) {
                accountRequests.get(accountId, storedRequestKey).responseBody = body;
            }
            return originalSend.call(res, body);
        };
    }

    return next();
}

function codeIsIdempotentCached(code: number): boolean {
    // see https://stripe.com/docs/error-handling#content-errors
    return code !== 401 && code !== 429;
}
