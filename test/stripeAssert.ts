import Stripe = require("stripe");
import chai = require("chai");
import chaiAsPromised = require("chai-as-promised");
import log = require("loglevel");

chai.use(chaiAsPromised);

export async function assertErrorPromisesAreEqual(actual: Promise<any>, expected: Promise<any>): Promise<void> {
    await chai.assert.isRejected(actual);
    await chai.assert.isRejected(expected);

    try {
        await actual;
    } catch (actualError) {
        try {
            await expected;
        } catch (expectedError) {
            assertErrorsAreEqual(actualError, expectedError);
        }
    }
}

export function assertErrorsAreEqual(actual: any, expected: any): void {
    const comparableKeys: (keyof Stripe.errors.StripeError)[] = ["rawType", "code", "type"];
    for (const key of comparableKeys) {
        chai.assert.deepEqual(actual[key], expected[key], `comparing key '${key}'`);
    }
}

export async function assertChargePromisesAreBasicallyEqual(actual: Promise<Stripe.charges.ICharge>, expected: Promise<Stripe.charges.ICharge>): Promise<void> {
    await chai.assert.isFulfilled(actual, "actual");
    await chai.assert.isFulfilled(expected, "expected");

    assertChargesAreBasicallyEqual(await actual, await expected);
}

export function assertChargesAreBasicallyEqual(actual: Stripe.charges.ICharge, expected: Stripe.charges.ICharge): void {
    chai.assert.match(actual.id, /^ch_/, "actual charge ID is convincing");

    const comparableKeys: (keyof Stripe.charges.ICharge)[] = ["object", "amount", "amount_refunded", "application_fee", "captured", "currency", "description", "failure_code", "failure_message", "metadata", "paid", "refunded", "status"];
    for (const key of comparableKeys) {
        chai.assert.deepEqual(actual[key], expected[key], `comparing key '${key}'`);
    }
}
