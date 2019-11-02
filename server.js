/**
 * This is a utility alias.
 *
 * This allows users of the library via `npm install`
 * to import it as `require('stripe-stateful-mock/server)`
 *
 * If you import `stripe-stateful-mock` directly it will listen
 * on port 8000.
 *
 * If you import the server you can listen on any port you
 * want, which is super useful for integration tests & CI.
 */
module.exports = require("./dist/server.js")
