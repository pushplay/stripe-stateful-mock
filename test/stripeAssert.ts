import Stripe = require("stripe");
import chai = require("chai");

export async function assertErrorThunksAreEqual(actual: () => Promise<any>, expected: () => Promise<any>): Promise<void> {
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
export function assertChargesAreBasicallyEqual(actual: Stripe.charges.ICharge, expected: Stripe.charges.ICharge, message?: string): void {
    chai.assert.match(actual.id, /^ch_/, `actual charge ID is formatted correctly ${message}`);

    for (const key of chargeComparableKeys) {
        chai.assert.deepEqual(actual[key], expected[key], `comparing key '${key} ${message}'`);
    }
    chai.assert.equal(actual.refunds.total_count, expected.refunds.total_count, message);
    chai.assert.lengthOf(actual.refunds.data, actual.refunds.total_count, message);

    for (let refundIx = 0; refundIx < expected.refunds.total_count; refundIx++) {
        assertRefundsAreBasicallyEqual(actual.refunds.data[refundIx], expected.refunds.data[refundIx], `of refund ${refundIx} ${message}`);
    }
}

const refundComparableKeys: (keyof Stripe.refunds.IRefund)[] = ["object", "amount", "currency", "metadata", "reason", "status"];
export function assertRefundsAreBasicallyEqual(actual: Stripe.refunds.IRefund, expected: Stripe.refunds.IRefund, message?: string): void {
    for (const key of refundComparableKeys) {
        chai.assert.deepEqual(actual[key], expected[key], `comparing key '${key}' of refund ${message}`);
    }
}
