import Stripe from "stripe";
import {assertErrorThunksAreEqual} from "./stripeAssert";
import {port} from "../src/autoStart";
import {getLiveStripeClient, getLocalStripeClient} from "./stripeUtils";

describe("auth", () => {

    const testChargeParams: Stripe.ChargeCreateParams = {
        currency: "usd",
        amount: 2000,
        source: "tok_visa"
    };

    it("matches the server error when the API key does not start with sk_test_", async () => {
        const localClient = new Stripe("foobar", {
            apiVersion: process.env["STRIPE_API_VERSION"] as any,
            host: "localhost",
            port: port,
            protocol: "http"
        });

        const liveClient = new Stripe("foobar", {
            apiVersion: process.env["STRIPE_API_VERSION"] as any
        });

        await assertErrorThunksAreEqual(
            () => localClient.charges.create(testChargeParams),
            () => liveClient.charges.create(testChargeParams)
        );
    });

    it("matches the server error when the Stripe-Account header is invalid", async () => {
        await assertErrorThunksAreEqual(
            () => getLocalStripeClient().charges.create(testChargeParams, {stripeAccount: "acct_invalid"}),
            () => getLiveStripeClient().charges.create(testChargeParams, {stripeAccount: "acct_invalid"})
        );
    });
});
