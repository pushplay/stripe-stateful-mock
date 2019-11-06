import log = require("loglevel");
import {createExpressApp} from "./";

// This script starts the server automatically using env vars to control configuration.

log.setDefaultLevel("info");
if (process.env.hasOwnProperty("LOG_LEVEL")) {
    log.setLevel(process.env["LOG_LEVEL"] as any);
}

const app = createExpressApp();

const port = process.env["PORT"] || 8000;
app.listen(+port, () => {
    log.info(`Server started on port ${port}`);
});

export {app, port};
