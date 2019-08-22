import express from 'express';
import bodyParser from 'body-parser';
import basicAuthParser = require('basic-auth');
import log = require("loglevel");
import {routes} from './routes';
import StripeError from "./api/StripeError";

if (process.env.hasOwnProperty("LOG_LEVEL")) {
    log.setLevel(process.env["LOG_LEVEL"] as any);
}

const port = process.env["PORT"] || 8000;

const app = express();

// Body handling before routes.
app.use(bodyParser.urlencoded({ extended: true }));

// Auth handling before routes.
app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
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
});

// Routes.
app.use('/', routes);

// Error handling comes last.
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err instanceof StripeError) {
        log.debug("stripe error:", err.message);
        res.status(err.statusCode).send({error: err.error});
        return;
    }

    log.error("unexpected error:", err.stack);
    res.status(500).send({
        message: "Unexpected error: " + err.message,
        stack: err.stack
    });
});

app.listen(+port, () => {
    log.info(`Server started on port ${port}`);
});

export {app, port};
