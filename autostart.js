// This script starts the server automatically using env vars to control configuration.
// eg: require("stripe-stateful-mock/autostart")
// It lives outside `src` so it can be required without including `dist` in the path.

require("./dist/autostart");
