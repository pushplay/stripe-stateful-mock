import Stripe = require("stripe");
import chai = require("chai");

export async function assertErrorPromisesAreEqual(actual: () => Promise<any>, expected: () => Promise<any>): Promise<void> {
    let actualError: any;
    try {
        await actual();
    } catch (err) {
        actualError = err;
    }

    let expectedError: any;
    try {
        await expected();
    } catch (err) {
        expectedError = err;
    }

    chai.assert.isDefined(actualError, "actual is rejected");
    chai.assert.isDefined(expectedError, "expected is rejected");
    assertErrorsAreEqual(actualError, expectedError);
}

export function assertErrorsAreEqual(actual: any, expected: any): void {
    const comparableKeys: (keyof Stripe.errors.StripeError)[] = ["rawType", "code", "type"];
    for (const key of comparableKeys) {
        chai.assert.deepEqual(actual[key], expected[key], `comparing key '${key}'`);
    }
}

const chargeComparableKeys: (keyof Stripe.charges.ICharge)[] = ["object", "amount", "amount_refunded", "application_fee", "captured", "currency", "description", "failure_code", "failure_message", "metadata", "paid", "receipt_email", "refunded", "status", "transfer_group"];
const refundComparableKeys: (keyof Stripe.refunds.IRefund)[] = ["object", "amount", "currency", "metadata", "reason", "status"];

export function assertChargesAreBasicallyEqual(actual: Stripe.charges.ICharge, expected: Stripe.charges.ICharge): void {
    chai.assert.match(actual.id, /^ch_/, "actual charge ID is formatted correctly");

    for (const key of chargeComparableKeys) {
        chai.assert.deepEqual(actual[key], expected[key], `comparing key '${key}'`);
    }
    chai.assert.equal(actual.refunds.total_count, expected.refunds.total_count);
    chai.assert.lengthOf(actual.refunds.data, actual.refunds.total_count);

    for (let refundIx = 0; refundIx < expected.refunds.total_count; refundIx++) {
        for (const key of refundComparableKeys) {
            chai.assert.deepEqual(actual.refunds.data[refundIx][key], expected.refunds.data[refundIx][key], `comparing key '${key}' of refund ${refundIx}`);
        }
    }
}
