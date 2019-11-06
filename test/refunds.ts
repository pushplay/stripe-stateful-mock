import chaiExclude from "chai-exclude";
import {getLocalStripeClient} from "./stripeUtils";
import {generateId} from "../src/api/utils";
import {buildStripeParityTest} from "./buildStripeParityTest";
import chai = require("chai");

chai.use(chaiExclude);

describe("refunds", () => {

    const localStripeClient = getLocalStripeClient();

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
            const refundedCharge = await stripeClient.charges.retrieve(charge.id);
            const retrievedRefund = await stripeClient.refunds.retrieve(refund.id);
            return [charge, refund, refundedCharge, retrievedRefund];
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
            const refundedCharge = await stripeClient.charges.retrieve(charge.id);
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
            const refund1 = await stripeClient.refunds.create({
                charge: charge.id,
                amount: 1200,
                metadata: {
                    extra: "info"
                }
            });
            const refund2 = await stripeClient.refunds.create({
                charge: charge.id,
                metadata: {
                    extra: "even more info"
                }
            });
            const refundedCharge = await stripeClient.charges.retrieve(charge.id);
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
            const refundedCharge = await stripeClient.charges.retrieve(charge.id);
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
            const refundedCharge = await stripeClient.charges.retrieve(charge.id);
            return [charge, capture, refund, refundedCharge];
        }
    ));

    it("can list refunds by charge", async () => {
        const charge = await localStripeClient.charges.create({
            amount: 900,
            currency: "usd",
            source: "tok_visa"
        });

        const unrelatedCharge = await localStripeClient.charges.create({
            amount: 1250,
            currency: "usd",
            source: "tok_visa"
        });
        await localStripeClient.refunds.create({charge: unrelatedCharge.id});

        const refund1 = await localStripeClient.refunds.create({charge: charge.id, amount: 420});
        chai.assert.equal(refund1.charge, charge.id);
        const refunds1 = await localStripeClient.refunds.list({charge: charge.id});
        chai.assert.deepEqual(refunds1.data, [refund1]);

        const refund2 = await localStripeClient.refunds.create({charge: charge.id});
        chai.assert.equal(refund2.charge, charge.id);
        const refunds2 = await localStripeClient.refunds.list({charge: charge.id});
        chai.assert.sameDeepMembers(refunds2.data, [refund2, refund1]);

        // Should be sorted newest to oldest but the test comes too quickly to be able to sort.
        const refundsLimited1 = await localStripeClient.refunds.list({charge: charge.id, limit: 1});
        chai.assert.lengthOf(refundsLimited1.data, 1);
        const refundsLimited2 = await localStripeClient.refunds.list({charge: charge.id, limit: 1, starting_after: refundsLimited1.data[0].id});
        chai.assert.lengthOf(refundsLimited2.data, 1);
        chai.assert.sameDeepMembers([...refundsLimited1.data, ...refundsLimited2.data], refunds2.data);
    });

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

            // Because the dispute is created after the charge is returned there's a race condition.
            await new Promise(resolve => setTimeout(resolve));

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
