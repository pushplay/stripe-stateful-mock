import Stripe = require("stripe");
import chai = require("chai");
import chaiAsPromised = require("chai-as-promised");
import log = require("loglevel");

chai.use(chaiAsPromised);

export async function assertErrorsAreEqual(actual: Promise<any>, expected: Promise<any>): Promise<void> {
    await chai.assert.isRejected(actual);
    await chai.assert.isRejected(expected);

    try {
        await actual;
    } catch (actualError) {
        try {
            await expected;
        } catch (expectedError) {
            const comparableKeys: (keyof Stripe.errors.StripeError)[] = ["rawType", "code", "type"];
            for (const key of comparableKeys) {
                chai.assert.deepEqual(actualError[key], expectedError[key], `comparing key '${key}'`);
            }
        }
    }
}

export async function assertChargesAreBasicallyEqual(actualPromise: Promise<Stripe.charges.ICharge>, expectedPromise: Promise<Stripe.charges.ICharge>): Promise<void> {
    await chai.assert.isFulfilled(actualPromise, "actual");
    await chai.assert.isFulfilled(expectedPromise, "expected");

    const actual = await actualPromise;
    const expected = await expectedPromise;

    chai.assert.match(actual.id, /^ch_/, "actual charge ID is convincing");

    const comparableKeys: (keyof Stripe.charges.ICharge)[] = ["object", "amount", "amount_refunded", "application_fee", "captured", "currency", "description", "failure_code", "failure_message", "metadata", "paid", "refunded", "status"];
    for (const key of comparableKeys) {
        chai.assert.deepEqual(actual[key], expected[key], `comparing key '${key}'`);
    }
}
