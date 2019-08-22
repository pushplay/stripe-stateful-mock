import express from 'express';
import basicAuthParser = require('basic-auth');

export function authRoute(req: express.Request, res: express.Response, next: express.NextFunction): void {
    let token = null;

    const authorizationHeader = req.header("authorization");
    const basicAuth = basicAuthParser(req);
    if (authorizationHeader && authorizationHeader.startsWith("Bearer ")) {
        token = /^Bearer (.*)/.exec(authorizationHeader)[1];
    } else if (basicAuth) {
        token = basicAuth.name;
    }

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
                message: `Invalid API Key provided: ${token.substr(0, Math.min(token.length, 11))}${new Array(token.length - Math.min(token.length, 15)).fill("*").join("")}${token.substr(token.length - Math.min(token.length, 4))}`,
                type: "invalid_request_error"
            }
        });
    } else {
        next();
    }
}
