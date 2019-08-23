import Stripe = require("stripe");
import {assertErrorThunksAreEqual} from "./stripeAssert";
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

        const liveClient = new Stripe("foobar");

        await assertErrorThunksAreEqual(() => localClient.charges.create(testChargeParams), () => liveClient.charges.create(testChargeParams));
    });
});
