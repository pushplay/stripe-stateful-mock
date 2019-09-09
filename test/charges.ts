import stripe, {charges} from "stripe";
import chai = require("chai");
import chaiExclude from "chai-exclude";
import {getLiveStripeClient, getLocalStripeClient} from "./stripeUtils";
import {
    assertChargesAreBasicallyEqual,
    assertErrorThunksAreEqual,
    assertErrorsAreEqual,
    assertRefundsAreBasicallyEqual,
    assertDisputesAreBasicallyEqual, assertListsAreBasicallyEqual
} from "./stripeAssert";
import {generateId} from "../src/api/utils";
import {buildStripeParityTest} from "./buildStripeParityTest";

chai.use(chaiExclude);

describe("charges", () => {

    const buildChargeParityTest = (params: stripe.charges.IChargeCreationOptions) =>
        buildStripeParityTest(
            async stripeClient => {
                const charge = await stripeClient.charges.create(params);
                return [charge];
            }
        );

    const buildChargeFailureParityTest = (params: stripe.charges.IChargeCreationOptions) =>
        buildStripeParityTest(
            async stripeClient => {
                let chargeError: any;
                try {
                    await stripeClient.charges.create(params);
                } catch (err) {
                    chargeError = err;
                }
                return [chargeError];
            }
        );

    it("supports tok_visa", buildChargeParityTest({
        amount: 2000,
        currency: "usd",
        source: "tok_visa"
    }));

    it("supports tok_visa_debit", buildChargeParityTest({
        amount: 2000,
        currency: "usd",
        source: "tok_visa_debit"
    }));

    it("supports tok_mastercard", buildChargeParityTest({
        amount: 2000,
        currency: "usd",
        source: "tok_mastercard"
    }));

    it("supports tok_mastercard_debit", buildChargeParityTest({
        amount: 2000,
        currency: "usd",
        source: "tok_mastercard_debit"
    }));

    it("supports tok_mastercard_prepaid", buildChargeParityTest({
        amount: 2000,
        currency: "usd",
        source: "tok_mastercard_prepaid"
    }));

    it("supports tok_amex", buildChargeParityTest({
        amount: 2000,
        currency: "usd",
        source: "tok_amex"
    }));

    it("supports tok_riskLevelElevated", buildChargeParityTest({
        amount: 2000,
        currency: "usd",
        source: "tok_riskLevelElevated"
    }));

    it("supports tok_chargeDeclined", buildChargeFailureParityTest({
        amount: 2000,
        currency: "usd",
        source: "tok_chargeDeclined"
    }));

    it("supports tok_chargeDeclinedInsufficientFunds", buildChargeFailureParityTest({
        amount: 2000,
        currency: "usd",
        source: "tok_chargeDeclinedInsufficientFunds"
    }));

    it("supports tok_chargeDeclinedFraudulent", buildChargeFailureParityTest({
        amount: 2000,
        currency: "usd",
        source: "tok_chargeDeclinedFraudulent"
    }));

    it("supports tok_chargeDeclinedIncorrectCvc", buildChargeFailureParityTest({
        amount: 2000,
        currency: "usd",
        source: "tok_chargeDeclinedIncorrectCvc"
    }));

    it("supports tok_chargeDeclinedExpiredCard", buildChargeFailureParityTest({
        amount: 2000,
        currency: "usd",
        source: "tok_chargeDeclinedExpiredCard"
    }));

    it("supports tok_chargeDeclinedProcessingError", buildChargeFailureParityTest({
        amount: 2000,
        currency: "usd",
        source: "tok_chargeDeclinedProcessingError"
    }));

    it("supports tok_chargeDeclinedProcessingError", buildChargeFailureParityTest({
        amount: 2000,
        currency: "usd",
        source: "tok_chargeDeclinedProcessingError"
    }));

    it("supports tok_createDispute", buildStripeParityTest(
        async stripeClient => {
            const charge = await stripeClient.charges.create({
                amount: 5000,
                currency: "usd",
                source: "tok_createDispute"
            });
            chai.assert.isNull(charge.dispute);

            const chargeGet = await stripeClient.charges.retrieve(charge.id);
            chai.assert.isString(chargeGet.dispute);
            return [charge, chargeGet];
        }
    ));

    it("supports tok_createDisputeProductNotReceived", buildStripeParityTest(
        async stripeClient => {
            const charge = await stripeClient.charges.create({
                amount: 5000,
                currency: "usd",
                source: "tok_createDisputeProductNotReceived"
            });
            chai.assert.isNull(charge.dispute);

            const chargeGet = await stripeClient.charges.retrieve(charge.id);
            chai.assert.isString(chargeGet.dispute);
            return [charge, chargeGet];
        }
    ));

    it("supports tok_createDisputeInquiry", buildStripeParityTest(
        async stripeClient => {
            const charge = await stripeClient.charges.create({
                amount: 5000,
                currency: "usd",
                source: "tok_createDisputeInquiry"
            });
            chai.assert.isNull(charge.dispute);

            const chargeGet = await stripeClient.charges.retrieve(charge.id);
            chai.assert.isString(chargeGet.dispute);
            return [charge, chargeGet];
        }
    ));

    it("supports metadata", buildChargeParityTest({
        amount: 8888,
        currency: "usd",
        source: "tok_visa",
        metadata: {
            selfReferential: "yes",
            testNumberHandling: 420
        }
    }));

    it("supports capture=false", buildStripeParityTest(
         async stripeClient => {
             const charge = await stripeClient.charges.create({
                 amount: 3500,
                 currency: "usd",
                 source: "tok_visa",
                 capture: false
             });
             chai.assert.isFalse(charge.captured);
             return [charge];
         }
    ));

    it("supports misc additional params", buildChargeParityTest({
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
    }));

    it("supports upper case currency", buildStripeParityTest(
        async stripeClient => {
            const charge = await stripeClient.charges.create({
                amount: 3500,
                currency: "USD",
                source: "tok_visa"
            });
            chai.assert.equal(charge.currency, "usd");
            return [charge];
        }
    ));

    it("checks amount is positive", buildChargeFailureParityTest({
        amount: -1,
        currency: "usd",
        source: "tok_visa"
    }));

    it("checks min amount", buildChargeFailureParityTest({
        amount: 5,
        currency: "usd",
        source: "tok_visa"
    }));

    it("checks max amount", buildChargeFailureParityTest({
        amount: 1000000000,
        currency: "usd",
        source: "tok_visa"
    }));

    it("supports Stripe-Account header (Connect account)", buildStripeParityTest(
        async stripeClient => {
            chai.assert.isString(process.env["STRIPE_CONNECTED_ACCOUNT_ID"], "connected account ID is set");

            const charge = await stripeClient.charges.create(
                {
                    amount: 2000,
                    currency: "usd",
                    source: "tok_visa"
                },
                {
                    stripe_account: process.env["STRIPE_CONNECTED_ACCOUNT_ID"]
                }
            );

            let retrieveError: any;
            try {
                await stripeClient.charges.retrieve(charge.id);
            } catch (err) {
                retrieveError = err;
            }
            chai.assert.isDefined(retrieveError, "charge should not be in the account, but should be in the connected account");

            const connectRetrieveCharge = await stripeClient.charges.retrieve(charge.id, {stripe_account: process.env["STRIPE_CONNECTED_ACCOUNT_ID"]});
            chai.assert.deepEqual(connectRetrieveCharge, charge);

            return [charge, retrieveError, connectRetrieveCharge];
        }
    ));

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

    describe("pending capture", () => {
        it("fully captures by default", buildStripeParityTest(
            async stripeClient => {
                const charge = await stripeClient.charges.create({
                    amount: 7200,
                    currency: "usd",
                    source: "tok_visa",
                    capture: false
                });
                chai.assert.isFalse(charge.captured);

                const capture = await stripeClient.charges.capture(charge.id);
                chai.assert.isTrue(capture.captured);
                chai.assert.lengthOf(capture.refunds.data, 0);

                return [charge, capture];
            }
        ));

        it("fully captures manually entered amount", buildStripeParityTest(
            async stripeClient => {
                const charge = await stripeClient.charges.create({
                    amount: 7200,
                    currency: "usd",
                    source: "tok_visa",
                    capture: false
                });
                chai.assert.isFalse(charge.captured);

                const capture = await stripeClient.charges.capture(charge.id, {amount: 7200});
                chai.assert.isTrue(capture.captured);
                chai.assert.lengthOf(capture.refunds.data, 0);

                return [charge, capture];
            }
        ));

        it("partially captures", buildStripeParityTest(
            async stripeClient => {
                const charge = await stripeClient.charges.create({
                    amount: 7200,
                    currency: "usd",
                    source: "tok_visa",
                    capture: false
                });
                chai.assert.isFalse(charge.captured);

                const capture = await stripeClient.charges.capture(charge.id, {amount: 3200});
                chai.assert.isTrue(capture.captured);
                chai.assert.lengthOf(capture.refunds.data, 1);

                return [charge, capture];
            }
        ));

        it("can't capture twice", buildStripeParityTest(
            async stripeClient => {
                const charge = await stripeClient.charges.create({
                    amount: 7200,
                    currency: "usd",
                    source: "tok_visa",
                    capture: false
                });
                chai.assert.isFalse(charge.captured);

                const capture = await stripeClient.charges.capture(charge.id, {amount: 3200});
                chai.assert.isTrue(capture.captured);
                chai.assert.lengthOf(capture.refunds.data, 1);

                let capture2Error: any;
                try {
                    await stripeClient.charges.capture(charge.id, {amount: 3200});
                } catch (err) {
                    capture2Error = err;
                }

                return [charge, capture, capture2Error];
            }
        ));

        it("can't capture less than the min charge", buildStripeParityTest(
            async stripeClient => {
                const charge = await stripeClient.charges.create({
                    amount: 7200,
                    currency: "usd",
                    source: "tok_visa",
                    capture: false
                });
                chai.assert.isFalse(charge.captured);

                let captureError: any;
                try {
                    await stripeClient.charges.capture(charge.id, {amount: 12});
                } catch (err) {
                    captureError = err;
                }

                return [charge, captureError];
            }
        ));

        it("can't capture a non-existent charge", buildStripeParityTest(
            async stripeClient => {
                let captureError: any;
                try {
                    await stripeClient.charges.capture(generateId());
                } catch (err) {
                    captureError = err;
                }

                return [captureError];
            }
        ));
    });

    describe("pending void", () => {
        it("fully voids by default", buildStripeParityTest(
            async stripeClient => {
                const charge = await stripeClient.charges.create({
                    amount: 7200,
                    currency: "usd",
                    source: "tok_visa",
                    capture: false
                });
                chai.assert.isFalse(charge.captured);

                const voyed = await stripeClient.refunds.create({charge: charge.id});

                return [charge, voyed];
            }
        ));

        it("fully voids manually entered amount", buildStripeParityTest(
            async stripeClient => {
                const charge = await stripeClient.charges.create({
                    amount: 7200,
                    currency: "usd",
                    source: "tok_visa",
                    capture: false
                });
                chai.assert.isFalse(charge.captured);

                const voyed = await stripeClient.refunds.create({charge: charge.id, amount: 7200});

                return [charge, voyed];
            }
        ));

        it("stores void metadata", buildStripeParityTest(
            async stripeClient => {
                const charge = await stripeClient.charges.create({
                    amount: 7200,
                    currency: "usd",
                    source: "tok_visa",
                    capture: false
                });
                chai.assert.isFalse(charge.captured);

                const voyed = await stripeClient.refunds.create({
                    charge: charge.id,
                    metadata: {
                        extra: "info"
                    }
                });
                chai.assert.isObject(voyed.metadata);

                return [charge, voyed];
            }
        ));


        it("can't partially void", buildStripeParityTest(
            async stripeClient => {
                const charge = await stripeClient.charges.create({
                    amount: 7200,
                    currency: "usd",
                    source: "tok_visa",
                    capture: false
                });

                let voidError: any;
                try {
                    await stripeClient.refunds.create({charge: charge.id, amount: 1200})
                } catch (err) {
                    voidError = err;
                }

                return [charge, voidError];
            }
        ));
    });

    describe("refund", () => {
        it("can refund a whole charge", buildStripeParityTest(
            async stripeClient => {
                const charge = await stripeClient.charges.create({
                    amount: 4300,
                    currency: "usd",
                    source: "tok_visa",
                });
                const refund = await stripeClient.refunds.create({
                    charge: charge.id
                });
                const refundedCharge = await getLocalStripeClient().charges.retrieve(charge.id);
                return [charge, refund, refundedCharge];
            }
        ));

        it("can partial refund a charge", buildStripeParityTest(
            async stripeClient => {
                const charge = await stripeClient.charges.create({
                    amount: 4300,
                    currency: "usd",
                    source: "tok_visa",
                });
                const refund = await stripeClient.refunds.create({
                    charge: charge.id,
                    amount: 1200
                });
                const refundedCharge = await getLocalStripeClient().charges.retrieve(charge.id);
                return [charge, refund, refundedCharge];
            }
        ));

        it("can partial refund then whole refund a charge", buildStripeParityTest(
            async stripeClient => {
                const charge = await stripeClient.charges.create({
                    amount: 4300,
                    currency: "usd",
                    source: "tok_visa",
                });
                const refund1 = await getLocalStripeClient().refunds.create({
                    charge: charge.id,
                    amount: 1200,
                    metadata: {
                        extra: "info"
                    }
                });
                const refund2 = await getLocalStripeClient().refunds.create({
                    charge: charge.id,
                    metadata: {
                        extra: "even more info"
                    }
                });
                const refundedCharge = await getLocalStripeClient().charges.retrieve(charge.id);
                return [charge, refund1, refund2, refundedCharge];
            }
        ));

        it("can refund a charge with metadata and a reason", buildStripeParityTest(
            async stripeClient => {
                const charge = await stripeClient.charges.create({
                    amount: 4300,
                    currency: "usd",
                    source: "tok_visa",
                });
                const refund = await stripeClient.refunds.create({
                    charge: charge.id,
                    reason: "fraudulent",
                    metadata: {
                        extra: "info"
                    }
                });
                const refundedCharge = await getLocalStripeClient().charges.retrieve(charge.id);
                return [charge, refund, refundedCharge];
            }
        ));

        it("can refund a captured charge", buildStripeParityTest(
            async stripeClient => {
                const charge = await stripeClient.charges.create({
                    amount: 4300,
                    currency: "usd",
                    source: "tok_visa",
                    capture: false
                });
                const capture = await stripeClient.charges.capture(charge.id, {amount: 1300});
                const refund = await stripeClient.refunds.create({
                    charge: charge.id,
                    reason: "fraudulent",
                    metadata: {
                        extra: "info"
                    }
                });
                const refundedCharge = await getLocalStripeClient().charges.retrieve(charge.id);
                return [charge, capture, refund, refundedCharge];
            }
        ));

        it("can't refund a non-existent charge", buildStripeParityTest(
            async stripeClient => {
                let refundError: any = null;
                try {
                    await stripeClient.refunds.create({charge: generateId()});
                } catch (err) {
                    refundError = err;
                }
                return [refundError];
            }
        ));

        it("can't refund more than the amount on the charge", buildStripeParityTest(
            async stripeClient => {
                const charge = await stripeClient.charges.create({
                    amount: 4300,
                    currency: "usd",
                    source: "tok_visa"
                });

                let refundError: any = null;
                try {
                    await stripeClient.refunds.create({charge: charge.id, amount: 4500});
                } catch (err) {
                    refundError = err;
                }
                return [charge, refundError];
            }
        ));

        it("can't refund an already refunded charge", buildStripeParityTest(
            async stripeClient => {
                const charge = await stripeClient.charges.create({
                    amount: 4300,
                    currency: "usd",
                    source: "tok_visa"
                });

                const refund = await stripeClient.refunds.create({charge: charge.id});

                let refundError: any = null;
                try {
                    await stripeClient.refunds.create({charge: charge.id});
                } catch (err) {
                    refundError = err;
                }
                return [charge, refund, refundError];
            }
        ));

        it("can't refund a disputed charge with is_charge_refundable=false", buildStripeParityTest(
            async stripeClient => {
                const charge = await stripeClient.charges.create({
                    amount: 4300,
                    currency: "usd",
                    source: "tok_createDispute"
                });

                let refundError: any = null;
                try {
                    await stripeClient.refunds.create({charge: charge.id});
                } catch (err) {
                    refundError = err;
                }
                return [charge, refundError];
            }
        ));

        it("can refund a disputed charge with is_charge_refundable=true", buildStripeParityTest(
            async stripeClient => {
                const charge = await stripeClient.charges.create({
                    amount: 4300,
                    currency: "usd",
                    source: "tok_createDisputeInquiry"
                });
                const refund = await stripeClient.refunds.create({charge: charge.id});
                return [charge, refund];
            }
        ));
    });

    describe("update", () => {
        it("can update metadata", buildStripeParityTest(
             async stripeClient => {
                 const charge = await stripeClient.charges.create({
                     amount: 4300,
                     currency: "usd",
                     source: "tok_visa",
                     metadata: {
                         a: "alpha"
                     }
                 });
                 const updatedCharge = await stripeClient.charges.update(charge.id, {metadata: {a: "aardvark", b: "boa"}});

                 chai.assert.notDeepEqual(updatedCharge.metadata, charge.metadata);
                 return [charge, updatedCharge];
             }
        ));

        it("can update misc params", buildStripeParityTest(
             async stripeClient => {
                 const charge = await stripeClient.charges.create({
                     amount: 4300,
                     currency: "usd",
                     source: "tok_visa"
                 });
                 const updatedCharge = await stripeClient.charges.update(charge.id, {
                     receipt_email: "receipt@example.com",
                     description: "a new description"
                 });

                 return [charge, updatedCharge];
             }
        ));
    });
});
