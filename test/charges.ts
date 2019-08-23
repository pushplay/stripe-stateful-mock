import stripe from "stripe";
import chai = require("chai");
import {getLiveStripeClient, getLocalStripeClient} from "./stripeUtils";
import {
    assertChargesAreBasicallyEqual,
    assertErrorThunksAreEqual,
    assertErrorsAreEqual, assertRefundsAreBasicallyEqual
} from "./stripeAssert";
import {generateId} from "../src/api/utils";

interface ChargeTest {
    name: string;
    success: boolean,
    params: stripe.charges.IChargeCreationOptions;
}

describe("charges", () => {

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
            if (test.success) {
                const localCharge = await getLocalStripeClient().charges.create(test.params);
                const liveCharge = await getLiveStripeClient().charges.create(test.params);
                assertChargesAreBasicallyEqual(localCharge, liveCharge);

                const localGetCharge = await getLocalStripeClient().charges.retrieve(localCharge.id);
                chai.assert.deepEqual(localGetCharge, localCharge);
            } else {
                await assertErrorThunksAreEqual(
                    () => getLocalStripeClient().charges.create(test.params),
                    () => getLiveStripeClient().charges.create(test.params)
                );
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

    describe("pending capture", () => {
        it("fully captures by default", async () => {
            const chargeParams: stripe.charges.IChargeCreationOptions = {
                amount: 7200,
                currency: "usd",
                source: "tok_visa",
                capture: false
            };
            const localCharge = await getLocalStripeClient().charges.create(chargeParams);
            chai.assert.isFalse(localCharge.captured);

            const localCapture = await getLocalStripeClient().charges.capture(localCharge.id);
            chai.assert.isTrue(localCapture.captured);
            chai.assert.lengthOf(localCapture.refunds.data, 0);

            const liveCharge = await getLiveStripeClient().charges.create(chargeParams);
            chai.assert.isFalse(liveCharge.captured);

            const liveCapture = await getLiveStripeClient().charges.capture(liveCharge.id);
            chai.assert.isTrue(liveCapture.captured);

            assertChargesAreBasicallyEqual(localCharge, liveCharge);
            assertChargesAreBasicallyEqual(localCapture, liveCapture);
        });

        it("fully captures manually entered amount", async () => {
            const chargeParams: stripe.charges.IChargeCreationOptions = {
                amount: 7200,
                currency: "usd",
                source: "tok_visa",
                capture: false
            };
            const localCharge = await getLocalStripeClient().charges.create(chargeParams);
            chai.assert.isFalse(localCharge.captured);

            const localCapture = await getLocalStripeClient().charges.capture(localCharge.id, {amount: 7200});
            chai.assert.isTrue(localCapture.captured);
            chai.assert.lengthOf(localCapture.refunds.data, 0);

            const liveCharge = await getLiveStripeClient().charges.create(chargeParams);
            chai.assert.isFalse(liveCharge.captured);

            const liveCapture = await getLiveStripeClient().charges.capture(liveCharge.id, {amount: 7200});
            chai.assert.isTrue(liveCapture.captured);

            assertChargesAreBasicallyEqual(localCharge, liveCharge);
            assertChargesAreBasicallyEqual(localCapture, liveCapture);
        });

        it("partially captures", async () => {
            const chargeParams: stripe.charges.IChargeCreationOptions = {
                amount: 7200,
                currency: "usd",
                source: "tok_visa",
                capture: false
            };
            const localCharge = await getLocalStripeClient().charges.create(chargeParams);
            chai.assert.isFalse(localCharge.captured);

            const localCapture = await getLocalStripeClient().charges.capture(localCharge.id, {amount: 3200});
            chai.assert.isTrue(localCapture.captured);
            chai.assert.lengthOf(localCapture.refunds.data, 1);

            const localRefund = await getLocalStripeClient().refunds.retrieve(localCapture.refunds.data[0].id);
            chai.assert.deepEqual(localRefund, localCapture.refunds.data[0]);

            const liveCharge = await getLiveStripeClient().charges.create(chargeParams);
            chai.assert.isFalse(liveCharge.captured);

            const liveCapture = await getLiveStripeClient().charges.capture(liveCharge.id, {amount: 3200});
            chai.assert.isTrue(liveCapture.captured);

            assertChargesAreBasicallyEqual(localCharge, liveCharge);
            assertChargesAreBasicallyEqual(localCapture, liveCapture);
        });

        it("can't capture twice", async () => {
            const chargeParams: stripe.charges.IChargeCreationOptions = {
                amount: 7200,
                currency: "usd",
                source: "tok_visa",
                capture: false
            };
            const localCharge = await getLocalStripeClient().charges.create(chargeParams);
            await getLocalStripeClient().charges.capture(localCharge.id, {amount: 3200});

            const liveCharge = await getLiveStripeClient().charges.create(chargeParams);
            await getLiveStripeClient().charges.capture(liveCharge.id, {amount: 3200});

            assertErrorThunksAreEqual(
                () => getLocalStripeClient().charges.capture(localCharge.id, {amount: 3200}),
                () => getLiveStripeClient().charges.capture(liveCharge.id, {amount: 3200})
            );
        });

        it("can't capture less than the min charge", async () => {
            const chargeParams: stripe.charges.IChargeCreationOptions = {
                amount: 7200,
                currency: "usd",
                source: "tok_visa",
                capture: false
            };
            const localCharge = await getLocalStripeClient().charges.create(chargeParams);

            const liveCharge = await getLiveStripeClient().charges.create(chargeParams);

            assertErrorThunksAreEqual(
                () => getLocalStripeClient().charges.capture(localCharge.id, {amount: 12}),
                () => getLiveStripeClient().charges.capture(liveCharge.id, {amount: 12})
            );
        });

        it("can't capture a non-existent charge", async () => {
            const chargeId = generateId();
            assertErrorThunksAreEqual(
                () => getLocalStripeClient().charges.capture(chargeId),
                () => getLiveStripeClient().charges.capture(chargeId)
            );
        });
    });

    describe("pending void", () => {
        it("fully voids by default", async () => {
            const chargeParams: stripe.charges.IChargeCreationOptions = {
                amount: 7200,
                currency: "usd",
                source: "tok_visa",
                capture: false
            };
            const localCharge = await getLocalStripeClient().charges.create(chargeParams);
            chai.assert.isFalse(localCharge.captured);

            const localVoid = await getLocalStripeClient().refunds.create({charge: localCharge.id});

            const liveCharge = await getLiveStripeClient().charges.create(chargeParams);
            chai.assert.isFalse(liveCharge.captured);

            const liveVoid = await getLiveStripeClient().refunds.create({charge: liveCharge.id});

            assertChargesAreBasicallyEqual(localCharge, liveCharge);
            assertRefundsAreBasicallyEqual(localVoid, liveVoid);
        });

        it("fully voids manually entered amount", async () => {
            const chargeParams: stripe.charges.IChargeCreationOptions = {
                amount: 7200,
                currency: "usd",
                source: "tok_visa",
                capture: false
            };
            const localCharge = await getLocalStripeClient().charges.create(chargeParams);
            chai.assert.isFalse(localCharge.captured);

            const localVoid = await getLocalStripeClient().refunds.create({charge: localCharge.id, amount: 7200});

            const liveCharge = await getLiveStripeClient().charges.create(chargeParams);
            chai.assert.isFalse(liveCharge.captured);

            const liveVoid = await getLiveStripeClient().refunds.create({charge: liveCharge.id, amount: 7200});

            assertChargesAreBasicallyEqual(localCharge, liveCharge);
            assertRefundsAreBasicallyEqual(localVoid, liveVoid);
        });

        it("can't partially void", async () => {
            const chargeParams: stripe.charges.IChargeCreationOptions = {
                amount: 7200,
                currency: "usd",
                source: "tok_visa",
                capture: false
            };
            const localCharge = await getLocalStripeClient().charges.create(chargeParams);
            chai.assert.isFalse(localCharge.captured);

            const liveCharge = await getLiveStripeClient().charges.create(chargeParams);
            chai.assert.isFalse(liveCharge.captured);

            assertErrorThunksAreEqual(
                () => getLocalStripeClient().refunds.create({charge: localCharge.id, amount: 7200}),
                () => getLiveStripeClient().refunds.create({charge: liveCharge.id, amount: 7200})
            );
        });
    });

    describe("refund", () => {
        it("can refund a whole charge", async () => {
            const chargeParams: stripe.charges.IChargeCreationOptions = {
                amount: 4300,
                currency: "usd",
                source: "tok_visa"
            };
            const localCharge = await getLocalStripeClient().charges.create(chargeParams);
            const localRefund = await getLocalStripeClient().refunds.create({
                charge: localCharge.id
            });
            const localRefundedCharge = await getLocalStripeClient().charges.retrieve(localCharge.id);

            const liveCharge = await getLocalStripeClient().charges.create(chargeParams);
            const liveRefund = await getLocalStripeClient().refunds.create({
                charge: liveCharge.id
            });
            const liveRefundedCharge = await getLocalStripeClient().charges.retrieve(liveCharge.id);

            assertRefundsAreBasicallyEqual(localRefund, liveRefund);
            assertChargesAreBasicallyEqual(localRefundedCharge, liveRefundedCharge);
        });

        it("can partial refund a charge", async () => {
            const chargeParams: stripe.charges.IChargeCreationOptions = {
                amount: 4300,
                currency: "usd",
                source: "tok_visa"
            };
            const localCharge = await getLocalStripeClient().charges.create(chargeParams);
            const localRefund = await getLocalStripeClient().refunds.create({
                charge: localCharge.id,
                amount: 1200
            });
            const localRefundedCharge = await getLocalStripeClient().charges.retrieve(localCharge.id);

            const liveCharge = await getLocalStripeClient().charges.create(chargeParams);
            const liveRefund = await getLocalStripeClient().refunds.create({
                charge: liveCharge.id,
                amount: 1200
            });
            const liveRefundedCharge = await getLocalStripeClient().charges.retrieve(liveCharge.id);

            assertRefundsAreBasicallyEqual(localRefund, liveRefund);
            assertChargesAreBasicallyEqual(localRefundedCharge, liveRefundedCharge);
        });

        it("can't refund a non-existent charge", async () => {
            const chargeId = generateId();
            assertErrorThunksAreEqual(
                () => getLocalStripeClient().refunds.create({charge: chargeId}),
                () => getLiveStripeClient().refunds.create({charge: chargeId})
            );
        });
    });
});
