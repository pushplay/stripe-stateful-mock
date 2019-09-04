import express from "express";
import bodyParser from "body-parser";
import log = require("loglevel");
import {routes} from "./routes";
import StripeError from "./api/StripeError";
import {idempotencyRoute} from "./api/idempotency";
import {authRoute} from "./api/auth";
import {loggingRoute} from "./api/logging";

if (process.env.hasOwnProperty("LOG_LEVEL")) {
    log.setLevel(process.env["LOG_LEVEL"] as any);
}

const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(loggingRoute);
app.use(authRoute);
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

const port = process.env["PORT"] || 8000;
app.listen(+port, () => {
    log.info(`Server started on port ${port}`);
});

export {app, port};
