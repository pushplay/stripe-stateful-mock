import stripe, {charges} from "stripe";
import chai = require("chai");
import {getLiveStripeClient, getLocalStripeClient} from "./stripeUtils";
import {
    assertChargesAreBasicallyEqual,
    assertErrorThunksAreEqual,
    assertErrorsAreEqual, assertRefundsAreBasicallyEqual
} from "./stripeAssert";
import {generateId} from "../src/api/utils";

describe("charges", () => {

    const chargeTests: {
        name: string;
        success: boolean,
        only?: boolean,
        params: stripe.charges.IChargeCreationOptions;
    }[] = [
        {
            name: "tok_visa",
            success: true,
            params: {
                amount: 2000,
                currency: "usd",
                source: "tok_visa"
            }
        },
        {
            name: "tok_visa_debit",
            success: true,
            params: {
                amount: 2000,
                currency: "usd",
                source: "tok_visa_debit"
            }
        },
        {
            name: "tok_mastercard",
            success: true,
            params: {
                amount: 5000,
                currency: "usd",
                source: "tok_mastercard"
            }
        },
        {
            name: "tok_mastercard_debit",
            success: true,
            params: {
                amount: 5000,
                currency: "usd",
                source: "tok_mastercard_debit"
            }
        },
        {
            name: "tok_mastercard_prepaid",
            success: true,
            params: {
                amount: 5000,
                currency: "usd",
                source: "tok_mastercard_prepaid"
            }
        },
        {
            name: "tok_amex",
            success: true,
            params: {
                amount: 3500,
                currency: "usd",
                source: "tok_amex"
            }
        },
        {
            name: "metadata",
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
            name: "capture=false",
            success: true,
            params: {
                amount: 3500,
                currency: "usd",
                source: "tok_visa",
                capture: false
            }
        },
        {
            name: "misc additional params",
            success: true,
            params: {
                amount: 3500,
                description: "this is a description",
                currency: "usd",
                on_behalf_of: process.env["STRIPE_CONNECTED_ACCOUNT_ID"],
                receipt_email: "foobar@example.com",
                shipping: {
                    address: {
                        city: "Beverly Hills",
                        country: "US",
                        line1: "1675 E. Altadena Drive",
                        line2: null,
                        postal_code: "90210",
                        state: "CA"

                    },
                    carrier: null,
                    name: "Henrietta",
                    phone: null,
                    tracking_number: "abc123"
                },
                source: "tok_visa",
                statement_descriptor: "ccc",
                transfer_group: "ddd"
            }
        },
        {
            name: "upper case currency",
            success: true,
            params: {
                amount: 3500,
                currency: "USD",
                source: "tok_visa"
            }
        },
        {
            name: "checking min transaction amount",
            success: false,
            params: {
                amount: 5,
                currency: "usd",
                source: "tok_visa"
            }
        },
        {
            name: "tok_riskLevelElevated",
            success: true,
            params: {
                amount: 1200,
                currency: "usd",
                source: "tok_riskLevelElevated"
            }
        },
        {
            name: "tok_chargeDeclined",
            success: false,
            params: {
                amount: 5000,
                currency: "usd",
                source: "tok_chargeDeclined"
            }
        },
        {
            name: "tok_chargeDeclinedInsufficientFunds",
            success: false,
            params: {
                amount: 5000,
                currency: "usd",
                source: "tok_chargeDeclinedInsufficientFunds"
            }
        },
        {
            name: "tok_chargeDeclinedIncorrectCvc",
            success: false,
            params: {
                amount: 5000,
                currency: "usd",
                source: "tok_chargeDeclinedIncorrectCvc"
            }
        },
        {
            name: "tok_chargeDeclinedExpiredCard",
            success: false,
            params: {
                amount: 5000,
                currency: "usd",
                source: "tok_chargeDeclinedExpiredCard"
            }
        }
    ];

    chargeTests.forEach(test => {
        (test.only ? it.only : it)(`supports ${test.name}`, async () => {
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

    it("supports Stripe-Account header (Connect account)", async () => {
        const params: stripe.charges.IChargeCreationOptions =  {
            amount: 2000,
            currency: "usd",
            source: "tok_visa"
        };

        chai.assert.isString(process.env["STRIPE_CONNECTED_ACCOUNT_ID"], "connected account ID is set");

        const localCharge = await getLocalStripeClient().charges.create(params, {stripe_account: process.env["STRIPE_CONNECTED_ACCOUNT_ID"]});

        let localRetrieveError: any;
        try {
            await getLocalStripeClient().charges.retrieve(localCharge.id);
        } catch (err) {
            localRetrieveError = err;
        }
        chai.assert.isDefined(localRetrieveError, "charge should not be in the account, but should be in the connected account");

        const localConnectRetrieveCharge = await getLocalStripeClient().charges.retrieve(localCharge.id, {stripe_account: process.env["STRIPE_CONNECTED_ACCOUNT_ID"]});
        chai.assert.deepEqual(localConnectRetrieveCharge, localCharge);

        const liveCharge = await getLiveStripeClient().charges.create(params, {stripe_account: process.env["STRIPE_CONNECTED_ACCOUNT_ID"]});

        let liveRetrieveError: any;
        try {
            await getLiveStripeClient().charges.retrieve(liveCharge.id);
        } catch (err) {
            liveRetrieveError = err;
        }
        chai.assert.isDefined(liveRetrieveError, "charge should not be in the account, but should be in the connected account");

        const liveConnectRetrieveCharge = await getLiveStripeClient().charges.retrieve(liveCharge.id, {stripe_account: process.env["STRIPE_CONNECTED_ACCOUNT_ID"]});
        chai.assert.deepEqual(liveConnectRetrieveCharge, liveCharge);

        assertChargesAreBasicallyEqual(localCharge, liveCharge);
    });

    describe("bonus secret tokens!", () => {
        describe("tok_429", () => {
            it("throws a 429 error", async () => {
                let error: any;
                try {
                    await getLocalStripeClient().charges.create({
                        amount: 5000,
                        currency: "usd",
                        source: "tok_429"
                    });
                } catch (err) {
                    error = err;
                }

                chai.assert.isDefined(error);
                chai.assert.equal(error.statusCode, 429);
                chai.assert.equal(error.rawType, "rate_limit_error");
                chai.assert.equal(error.type, "StripeRateLimitError");
            });
        });

        describe("tok_500", () => {
            it("throws a 500 error", async () => {
                let error: any;
                try {
                    await getLocalStripeClient().charges.create({
                        amount: 5000,
                        currency: "usd",
                        source: "tok_500"
                    });
                } catch (err) {
                    error = err;
                }

                chai.assert.isDefined(error);
                chai.assert.equal(error.statusCode, 500);
                chai.assert.equal(error.rawType, "api_error");
                chai.assert.equal(error.type, "StripeAPIError");
            });
        });

        describe("source token chains", async () => {
            it("supports test case tok_chargeDeclinedInsufficientFunds|tok_visa", async () => {
                const chargeParams: stripe.charges.IChargeCreationOptions = {
                    amount: 5000,
                    currency: "usd",
                    source: "tok_chargeDeclinedInsufficientFunds|tok_visa"
                };

                let nsfError: any;
                try {
                    await getLocalStripeClient().charges.create(chargeParams);
                } catch (err) {
                    nsfError = err;
                }
                chai.assert.isDefined(nsfError);
                chai.assert.equal(nsfError.type, "StripeCardError");

                const charge = await getLocalStripeClient().charges.create(chargeParams);
                chai.assert.equal(charge.amount, chargeParams.amount);
            });

            it("supports test case tok_500|tok_500|tok_visa", async () => {
                const chargeParams: stripe.charges.IChargeCreationOptions = {
                    amount: 5000,
                    currency: "usd",
                    source: "tok_500|tok_500|tok_visa"
                };

                let error1: any;
                try {
                    await getLocalStripeClient().charges.create(chargeParams);
                } catch (err) {
                    error1 = err;
                }
                chai.assert.isDefined(error1);
                chai.assert.equal(error1.statusCode, 500);
                chai.assert.equal(error1.type, "StripeAPIError");

                let error2: any;
                try {
                    await getLocalStripeClient().charges.create(chargeParams);
                } catch (err) {
                    error2 = err;
                }
                chai.assert.isDefined(error2);
                chai.assert.equal(error2.statusCode, 500);
                chai.assert.equal(error2.type, "StripeAPIError");

                const charge = await getLocalStripeClient().charges.create(chargeParams);
                chai.assert.equal(charge.amount, chargeParams.amount);
            });

            it("does not confuse 2 chains that are not identical", async () => {
                const chargeParams1: stripe.charges.IChargeCreationOptions = {
                    amount: 5000,
                    currency: "usd",
                    source: `tok_500|tok_visa|${generateId(8)}`
                };
                const chargeParams2: stripe.charges.IChargeCreationOptions = {
                    amount: 5000,
                    currency: "usd",
                    source: `tok_500|tok_visa|${generateId(8)}`
                };

                let error1: any;
                try {
                    await getLocalStripeClient().charges.create(chargeParams1);
                } catch (err) {
                    error1 = err;
                }
                chai.assert.isDefined(error1);
                chai.assert.equal(error1.statusCode, 500);
                chai.assert.equal(error1.type, "StripeAPIError");

                let error2: any;
                try {
                    await getLocalStripeClient().charges.create(chargeParams2);
                } catch (err) {
                    error2 = err;
                }
                chai.assert.isDefined(error2);
                chai.assert.equal(error2.statusCode, 500);
                chai.assert.equal(error2.type, "StripeAPIError");

                const charge1 = await getLocalStripeClient().charges.create(chargeParams1);
                chai.assert.equal(charge1.amount, chargeParams1.amount);

                const charge2 = await getLocalStripeClient().charges.create(chargeParams2);
                chai.assert.equal(charge2.amount, chargeParams2.amount);
            });
        });
    });

    describe("idempotency", () => {
        it("replays idempotent successes", async () => {
            const idempotencyKey = generateId();
            const params: stripe.charges.IChargeCreationOptions = {
                amount: 50000,
                currency: "usd",
                source: "tok_visa"
            };
            const originalCharge = await getLocalStripeClient().charges.create(params, {idempotency_key: idempotencyKey});
            const repeatCharge = await getLocalStripeClient().charges.create(params, {idempotency_key: idempotencyKey});

            chai.assert.deepEqual(repeatCharge, originalCharge);
        });

        it("replays idempotent errors", async () => {
            const idempotencyKey = generateId();
            const params: stripe.charges.IChargeCreationOptions = {
                amount: 5,
                currency: "usd",
                source: "tok_visa"
            };

            let originalError: any;
            try {
                await getLocalStripeClient().charges.create(params, {idempotency_key: idempotencyKey});
            } catch (err) {
                originalError = err;
            }
            chai.assert.isDefined(originalError);

            let repeatError: any;
            try {
                await getLocalStripeClient().charges.create(params, {idempotency_key: idempotencyKey});
            } catch (err) {
                repeatError = err;
            }
            chai.assert.isDefined(repeatError);

            assertErrorsAreEqual(repeatError, originalError);
            chai.assert.equal(repeatError.headers["original-request"], originalError.headers["request-id"]);
        });

        it("replays 500s (yes Stripe really does that)", async () => {
            const params: stripe.charges.IChargeCreationOptions = {
                amount: 5,          // This amount is too small but tok_500 takes precedence.
                currency: "usd",
                source: "tok_500"
            };
            const idempotencyKey = generateId();

            let originalError: any;
            try {
                await getLocalStripeClient().charges.create(params, {
                    idempotency_key: idempotencyKey
                });
            } catch (err) {
                originalError = err;
            }
            chai.assert.isDefined(originalError);
            chai.assert.equal(originalError.type, "StripeAPIError");

            let repeatError: any;
            try {
                await getLocalStripeClient().charges.create(params, {
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
            await getLocalStripeClient().charges.create({
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

        it("does not confused two Connected accounts", async () => {
            const idempotencyKey = generateId();

            await getLocalStripeClient().charges.create({
                amount: 1000,
                currency: "usd",
                source: "tok_visa"
            }, {
                idempotency_key: idempotencyKey,
                stripe_account: "acct_uno"
            });

            await getLocalStripeClient().charges.create({
                amount: 2000,
                currency: "usd",
                source: "tok_visa"
            }, {
                idempotency_key: idempotencyKey,
                stripe_account: "acct_dos"
            });
        });
    });

    it.skip("is much faster than calling Stripe (not usually worth running)", async () => {
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

            await assertErrorThunksAreEqual(
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

            await assertErrorThunksAreEqual(
                () => getLocalStripeClient().charges.capture(localCharge.id, {amount: 12}),
                () => getLiveStripeClient().charges.capture(liveCharge.id, {amount: 12})
            );
        });

        it("can't capture a non-existent charge", async () => {
            const chargeId = generateId();
            await assertErrorThunksAreEqual(
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

        it("fully voids manually entered amount with metadata", async () => {
            const chargeParams: stripe.charges.IChargeCreationOptions = {
                amount: 7200,
                currency: "usd",
                source: "tok_visa",
                capture: false
            };
            const localCharge = await getLocalStripeClient().charges.create(chargeParams);
            chai.assert.isFalse(localCharge.captured);

            const localVoid = await getLocalStripeClient().refunds.create({
                charge: localCharge.id,
                amount: 7200,
                metadata: {
                    extra: "info"
                }
            });

            const liveCharge = await getLiveStripeClient().charges.create(chargeParams);
            chai.assert.isFalse(liveCharge.captured);

            const liveVoid = await getLiveStripeClient().refunds.create({
                charge: liveCharge.id,
                amount: 7200,
                metadata: {
                    extra: "info"
                }
            });

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

            await assertErrorThunksAreEqual(
                () => getLocalStripeClient().refunds.create({charge: localCharge.id, amount: 1200}),
                () => getLiveStripeClient().refunds.create({charge: liveCharge.id, amount: 1200})
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

            const liveCharge = await getLiveStripeClient().charges.create(chargeParams);
            const liveRefund = await getLiveStripeClient().refunds.create({
                charge: liveCharge.id
            });
            const liveRefundedCharge = await getLiveStripeClient().charges.retrieve(liveCharge.id);

            assertRefundsAreBasicallyEqual(localRefund, liveRefund);
            assertChargesAreBasicallyEqual(localRefundedCharge, liveRefundedCharge);
        });

        it("can partial refund a charge with metadata", async () => {
            const chargeParams: stripe.charges.IChargeCreationOptions = {
                amount: 4300,
                currency: "usd",
                source: "tok_visa"
            };
            const localCharge = await getLocalStripeClient().charges.create(chargeParams);
            const localRefund = await getLocalStripeClient().refunds.create({
                charge: localCharge.id,
                amount: 1200,
                metadata: {
                    extra: "info"
                }
            });
            const localRefundedCharge = await getLocalStripeClient().charges.retrieve(localCharge.id);

            const liveCharge = await getLiveStripeClient().charges.create(chargeParams);
            const liveRefund = await getLiveStripeClient().refunds.create({
                charge: liveCharge.id,
                amount: 1200,
                metadata: {
                    extra: "info"
                }
            });
            const liveRefundedCharge = await getLiveStripeClient().charges.retrieve(liveCharge.id);

            assertRefundsAreBasicallyEqual(localRefund, liveRefund);
            assertChargesAreBasicallyEqual(localRefundedCharge, liveRefundedCharge);
        });

        it("can't refund a non-existent charge", async () => {
            const chargeId = generateId();
            await assertErrorThunksAreEqual(
                () => getLocalStripeClient().refunds.create({charge: chargeId}),
                () => getLiveStripeClient().refunds.create({charge: chargeId})
            );
        });
    });

    describe("update", () => {
        it("can update metadata", async () => {
            const chargeParams: stripe.charges.IChargeCreationOptions = {
                amount: 4300,
                currency: "usd",
                source: "tok_visa",
                metadata: {
                    a: "alpha"
                }
            };

            const localCharge = await getLocalStripeClient().charges.create(chargeParams);
            const localUpdatedCharge = await getLocalStripeClient().charges.update(localCharge.id, {metadata: {a: "aardvark", b: "boa"}});

            const liveCharge = await getLiveStripeClient().charges.create(chargeParams);
            const liveUpdatedCharge = await getLiveStripeClient().charges.update(liveCharge.id, {metadata: {a: "aardvark", b: "boa"}});

            assertChargesAreBasicallyEqual(localUpdatedCharge, liveUpdatedCharge);
        });

        it("can update misc params", async () => {
            const chargeParams: stripe.charges.IChargeCreationOptions = {
                amount: 4300,
                currency: "usd",
                source: "tok_visa"
            };

            const localCharge = await getLocalStripeClient().charges.create(chargeParams);
            const localUpdatedCharge = await getLocalStripeClient().charges.update(localCharge.id, {
                receipt_email: "receipt@example.com",
                description: "a new description"
            });

            const liveCharge = await getLiveStripeClient().charges.create(chargeParams);
            const liveUpdatedCharge = await getLiveStripeClient().charges.update(liveCharge.id, {
                receipt_email: "receipt@example.com",
                description: "a new description"
            });

            assertChargesAreBasicallyEqual(localUpdatedCharge, liveUpdatedCharge);
        });
    });
});
