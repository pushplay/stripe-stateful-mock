import express from "express";
import basicAuthParser = require("basic-auth");

export namespace auth {
    export function authRoute(req: express.Request, res: express.Response, next: express.NextFunction): void {
        const token = getAccessTokenFromRequest(req);

        if (!token) {
            res.status(401).send({
                error: {
                    message: "You did not provide an API key. You need to provide your API key in the Authorization header, using Bearer auth (e.g. 'Authorization: Bearer YOUR_SECRET_KEY'). See https://stripe.com/docs/api#authentication for details, or we can help at https://support.stripe.com/.",
                    type: "invalid_request_error"
                }
            });
        } else if (!/^sk_test_/.test(token)) {
            res.status(401).send({
                error: {
                    message: `Invalid API Key provided: ${censorAccessToken(token)}`,
                    type: "invalid_request_error"
                }
            });
        } else {
            next();
        }
    }

    export function getAccessTokenFromRequest(req: express.Request): string {
        const authorizationHeader = req.header("authorization");
        const basicAuth = basicAuthParser(req);
        if (authorizationHeader && authorizationHeader.startsWith("Bearer ")) {
            return /^Bearer (.*)/.exec(authorizationHeader)[1];
        } else if (basicAuth) {
            return basicAuth.name;
        }
        return null;
    }

    export function getCensoredAccessTokenFromRequest(req: express.Request): string {
        return censorAccessToken(getAccessTokenFromRequest(req));
    }

    export function censorAccessToken(token: string): string {
        return `${token.substr(0, Math.min(token.length, 11))}${new Array(token.length - Math.min(token.length, 15)).fill("*").join("")}${token.substr(token.length - Math.min(token.length, 4))}`;
    }
}
