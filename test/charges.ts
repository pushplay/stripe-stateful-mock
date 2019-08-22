import stripe from "stripe";
import chai = require("chai");
import chaiAsPromised = require("chai-as-promised");
import {getLiveStripeClient, getLocalStripeClient} from "./stripeUtils";
import {assertChargesAreBasicallyEqual, assertErrorsAreEqual} from "./stripeAssert";

chai.use(chaiAsPromised);

interface ChargeTest {
    name: string;
    success: boolean,
    params: stripe.charges.IChargeCreationOptions;
}

describe("charge handling", () => {

    const chargeTests: ChargeTest[] = [
        {
            name: "$20.00 Visa",
            success: true,
            params: {
                amount: 2000,
                currency: "usd",
                source: "tok_visa"
            }
        },
        {
            name: "$0.50 Mastercard",
            success: true,
            params: {
                amount: 50,
                currency: "usd",
                source: "tok_mastercard"
            }
        },
        {
            name: "$0.05 Visa",
            success: false,
            params: {
                amount: 5,
                currency: "usd",
                source: "tok_visa"
            }
        },
        {
            name: "Generic card declined",
            success: false,
            params: {
                amount: 5000,
                currency: "usd",
                source: "tok_chargeDeclined"
            }
        },
        {
            name: "Insufficient funds",
            success: false,
            params: {
                amount: 5000,
                currency: "usd",
                source: "tok_chargeDeclinedInsufficientFunds"
            }
        }
    ];

    chargeTests.forEach(test => {
        it(`matches on ${test.name}`, async () => {
            const localResponse = getLocalStripeClient().charges.create(test.params);
            const liveResponse = getLiveStripeClient().charges.create(test.params);

            if (test.success) {
                await assertChargesAreBasicallyEqual(localResponse, liveResponse);
            } else {
                await assertErrorsAreEqual(localResponse, liveResponse);
            }
        });
    })
});
