import Stripe = require("stripe");
import {port} from "../src";

let liveClient: Stripe;
let localClient: Stripe;

export function getLiveStripeClient(): Stripe {
    if (!liveClient) {
        liveClient = new Stripe(process.env["STRIPE_TEST_SECRET_KEY"]);
        liveClient.setApiVersion(process.env["STRIPE_API_VERSION"]);
    }
    return liveClient;
}

export function getLocalStripeClient(): Stripe {
    if (!localClient) {
        localClient = new Stripe("sk_test_foobar");
        localClient.setHost("localhost", port, "http");
        localClient.setApiVersion(process.env["STRIPE_API_VERSION"]);
    }
    return localClient;
}
