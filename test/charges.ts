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
            name: "Visa",
            success: true,
            params: {
                amount: 2000,
                currency: "usd",
                source: "tok_visa"
            }
        },
        {
            name: "Visa Debit",
            success: true,
            params: {
                amount: 2000,
                currency: "usd",
                source: "tok_visa_debit"
            }
        },
        {
            name: "Mastercard",
            success: true,
            params: {
                amount: 5000,
                currency: "usd",
                source: "tok_mastercard"
            }
        },
        {
            name: "Mastercard Debit",
            success: true,
            params: {
                amount: 5000,
                currency: "usd",
                source: "tok_mastercard_debit"
            }
        },
        {
            name: "Mastercard Prepaid",
            success: true,
            params: {
                amount: 5000,
                currency: "usd",
                source: "tok_mastercard_prepaid"
            }
        },
        {
            name: "American Express",
            success: true,
            params: {
                amount: 3500,
                currency: "usd",
                source: "tok_amex"
            }
        },
        {
            name: "Charge too small",
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
    });

    it.skip("is much faster than calling Stripe", async () => {
        const dateA = Date.now();
        for (const test of chargeTests) {
            try {
                await getLocalStripeClient().charges.create(test.params);
            } catch (err) {}
        }
        const dateB = Date.now();
        for (const test of chargeTests) {
            try {
                await getLiveStripeClient().charges.create(test.params);
            } catch (err) {}
        }
        const dateC = Date.now();

        chai.assert.isBelow(dateB - dateA, dateC - dateB);
        console.log("milliseconds local=", dateB - dateA, "milliseconds live=", dateC - dateB);
    }).timeout(120000);
});
