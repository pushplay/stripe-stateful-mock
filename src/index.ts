import log = require("loglevel");

import { createApp } from "./server";

if (process.env.hasOwnProperty("LOG_LEVEL")) {
    log.setLevel(process.env["LOG_LEVEL"] as any);
}

const app = createApp();

const port = process.env["PORT"] || 8000;
app.listen(+port, () => {
    log.info(`Server started on port ${port}`);
});

export {app, port};
