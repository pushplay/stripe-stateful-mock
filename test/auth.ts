import Stripe = require("stripe");
import {assertErrorPromisesAreEqual} from "./stripeAssert";
import {port} from "../src";

describe("auth", () => {

    const testChargeParams: Stripe.charges.IChargeCreationOptions = {
        currency: "usd",
        amount: 2000,
        source: "tok_visa"
    };

    it("matches on bad API key", async () => {
        const localClient = new Stripe("foobar");
        localClient.setHost("localhost", port, "http");
        const localResponse = localClient.charges.create(testChargeParams);

        const liveClient = new Stripe("foobar");
        const liveResponse = liveClient.charges.create(testChargeParams);

        await assertErrorPromisesAreEqual(localResponse, liveResponse);
    });
});
