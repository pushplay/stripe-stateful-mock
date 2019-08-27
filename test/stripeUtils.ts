import Stripe = require("stripe");
import {port} from "../src";

let liveClient: Stripe;
let localClient: Stripe;

export function getLiveStripeClient(): Stripe {
    if (!liveClient) {
        require("dotenv-safe").config();
        liveClient = new Stripe(process.env["STRIPE_TEST_SECRET_KEY"]);
        liveClient.setApiVersion("2019-08-14");
    }
    return liveClient;
}

export function getLocalStripeClient(): Stripe {
    if (!localClient) {
        localClient = new Stripe("sk_test_foobar");
        localClient.setHost("localhost", port, "http");
    }
    return localClient;
}
