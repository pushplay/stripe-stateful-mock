import stripe from "stripe";
import chai = require("chai");
import chaiAsPromised = require("chai-as-promised");
import {getLiveStripeClient, getLocalStripeClient} from "./stripeUtils";
import {assertChargePromisesAreBasicallyEqual, assertErrorPromisesAreEqual, assertErrorsAreEqual} from "./stripeAssert";
import {generateId} from "../src/api/utils";

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
            name: "Metadata",
            success: true,
            params: {
                amount: 8888,
                currency: "usd",
                source: "tok_visa",
                metadata: {
                    selfReferential: "yes",
                    testNumberHandling: 420
                }
            }
        },
        {
            name: "Pending",
            success: true,
            params: {
                amount: 3500,
                currency: "usd",
                source: "tok_visa",
                capture: false
            }
        },
        {
            name: "Misc additional params",
            success: true,
            params: {
                amount: 3500,
                currency: "usd",
                source: "tok_visa",
                description: "this is a description",
                receipt_email: "foobar@example.com"
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
                await assertChargePromisesAreBasicallyEqual(localResponse, liveResponse);

                const localCharge = await localResponse;
                const localGetCharge = await getLocalStripeClient().charges.retrieve(localCharge.id);
                chai.assert.deepEqual(localGetCharge, localCharge);
            } else {
                await assertErrorPromisesAreEqual(localResponse, liveResponse);
            }
        });
    });

    it("replays idempotent successes", async () => {
        const idempotencyKey = generateId();
        const originalCharge = await getLocalStripeClient().charges.create({
            amount: 3300,
            currency: "usd",
            source: "tok_visa"
        }, {
            idempotency_key: idempotencyKey
        });
        const repeatCharge = await getLocalStripeClient().charges.create({
            amount: 3300,
            currency: "usd",
            source: "tok_visa"
        }, {
            idempotency_key: idempotencyKey
        });

        chai.assert.deepEqual(repeatCharge, originalCharge);
    });

    it("replays idempotent errors", async () => {
        const idempotencyKey = generateId();
        let originalError: any;
        try {
            await getLocalStripeClient().charges.create({
                amount: 5,
                currency: "usd",
                source: "tok_visa"
            }, {
                idempotency_key: idempotencyKey
            });
        } catch (err) {
            originalError = err;
        }
        chai.assert.isDefined(originalError);

        let repeatError: any;
        try {
            await getLocalStripeClient().charges.create({
                amount: 5,
                currency: "usd",
                source: "tok_visa"
            }, {
                idempotency_key: idempotencyKey
            });
        } catch (err) {
            repeatError = err;
        }
        chai.assert.isDefined(repeatError);

        assertErrorsAreEqual(repeatError, originalError);
        chai.assert.equal(repeatError.headers["original-request"], originalError.headers["request-id"]);
    });

    it("sends the right error on mismatched idempotent bodies", async () => {
        const idempotencyKey = generateId();
        const originalCharge = await getLocalStripeClient().charges.create({
            amount: 1000,
            currency: "usd",
            source: "tok_visa"
        }, {
            idempotency_key: idempotencyKey
        });

        let repeatError: any;
        try {
            await getLocalStripeClient().charges.create({
                amount: 2000,
                currency: "usd",
                source: "tok_visa"
            }, {
                idempotency_key: idempotencyKey
            });
        } catch (err) {
            repeatError = err;
        }

        chai.assert.isDefined(repeatError);
        chai.assert.equal(repeatError.statusCode, 400);
        chai.assert.equal(repeatError.rawType, "idempotency_error");
        chai.assert.equal(repeatError.type, "StripeIdempotencyError");
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
