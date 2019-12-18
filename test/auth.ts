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
        const localClient = new Stripe(process.env["STRIPE_TEST_SECRET_KEY"], {
            apiVersion: "2019-12-03",
            host: "localhost",
            port: port
        });

        const liveClient = new Stripe(process.env["STRIPE_TEST_SECRET_KEY"], {
            apiVersion: "2019-12-03"
        });

        await assertErrorThunksAreEqual(
            () => localClient.charges.create(testChargeParams),
            () => liveClient.charges.create(testChargeParams)
        );
    });

    it("matches the server error when the Stripe-Account header is invalid", async () => {
        await assertErrorThunksAreEqual(
            () => getLocalStripeClient().charges.create(testChargeParams, {stripe_account: "acct_invalid"}),
            () => getLiveStripeClient().charges.create(testChargeParams, {stripe_account: "acct_invalid"})
        );
    });
});
