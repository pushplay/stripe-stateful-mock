import express = require("express");
import bodyParser = require("body-parser");
import log = require("loglevel");
import {routes} from "./routes";
import {StripeError} from "./api/StripeError";
import {idempotencyRoute} from "./api/idempotency";
import {auth} from "./api/auth";

export function createExpressApp(): express.Application {
    const app = express();

    app.use(bodyParser.urlencoded({extended: true}));
    app.use(auth.authRoute);
    app.use(idempotencyRoute);
    app.use("/", routes);

    // Error handling comes last.
    app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
        if (err instanceof StripeError) {
            res.status(err.statusCode).send({error: err.error});
            return;
        }

        log.error("Unexpected error:", err.stack);
        res.status(500).send({
            message: "Unexpected error: " + err.message,
            stack: err.stack
        });
    });

    return app;
}
