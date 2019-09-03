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

const comparableErrorKeys = ["code", "rawType", "statusCode", "type"];
const comparableRawErrorKeys = ["code", "decline_code", "doc_url", "param", "type"];
export function assertErrorsAreEqual(actual: any, expected: any): void {
    for (const key of comparableErrorKeys) {
        chai.assert.deepEqual(actual[key], expected[key], `comparing key '${key}'`);
    }
    for (const key of comparableRawErrorKeys) {
        chai.assert.deepEqual(actual.raw[key], expected.raw[key], `comparing key 'raw.${key}'`);
    }
}

const chargeComparableKeys: (keyof Stripe.charges.ICharge)[] = ["object", "amount", "amount_refunded", "application_fee", "application_fee_amount", "billing_details", "captured", "currency", "description", "failure_code", "failure_message", "metadata", "paid", "receipt_email", "refunded", "statement_descriptor", "statement_descriptor_suffix", "status", "transfer_group"];
export function assertChargesAreBasicallyEqual(actual: Stripe.charges.ICharge, expected: Stripe.charges.ICharge, message?: string): void {
    chai.assert.match(actual.id, /^ch_/, `actual charge ID is formatted correctly ${message}`);

    for (const key of chargeComparableKeys) {
        chai.assert.deepEqual(actual[key], expected[key], `comparing key '${key}' ${message || ""}`);
    }
    chai.assert.equal(actual.refunds.total_count, expected.refunds.total_count, message);
    chai.assert.lengthOf(actual.refunds.data, actual.refunds.total_count, message);

    assertOutcomesAreBasicallyEqual(actual.outcome, expected.outcome, message);
    assertRefundListsAreBasicallyEqual(actual.refunds, expected.refunds, message);
}

const outcomeComparableKeys: (keyof Stripe.charges.IOutcome)[] = ["network_status", "reason", "risk_level", "rule", "seller_message", "type"];
function assertOutcomesAreBasicallyEqual(actual: Stripe.charges.IOutcome, expected: Stripe.charges.IOutcome, message?: string): void {
    for (const key of outcomeComparableKeys) {
        chai.assert.deepEqual(actual[key], expected[key], `comparing key '${key}' ${message || ""}`);
    }
}

export function assertRefundListsAreBasicallyEqual(actual: Stripe.IList<Stripe.refunds.IRefund>, expected: Stripe.IList<Stripe.refunds.IRefund>, message?: string): void {
    chai.assert.equal(actual.total_count, expected.total_count, message);
    chai.assert.lengthOf(actual.data, expected.data.length, message);

    for (let refundIx = 0; refundIx < expected.total_count; refundIx++) {
        assertRefundsAreBasicallyEqual(actual.data[refundIx], expected.data[refundIx], `of refund ${refundIx} ${message || ""}`);
    }
}

const refundComparableKeys: (keyof Stripe.refunds.IRefund)[] = ["object", "amount", "currency", "description", "metadata", "reason", "status"];
export function assertRefundsAreBasicallyEqual(actual: Stripe.refunds.IRefund, expected: Stripe.refunds.IRefund, message?: string): void {
    for (const key of refundComparableKeys) {
        chai.assert.deepEqual(actual[key], expected[key], `comparing key '${key}' ${message || ""}`);
    }
}

const customerKeys: (keyof Stripe.customers.ICustomer)[] = ["object", "account_balance", "address", "balance", "currency", "delinquent", "description", "discount", "email", "invoice_settings", "livemode", "metadata", "name", "phone", "preferred_locales", "shipping"];
export function assertCustomersAreBasicallyEqual(actual: Stripe.customers.ICustomer, expected: Stripe.customers.ICustomer, message?: string): void {
    for (const key of customerKeys) {
        chai.assert.deepEqual(actual[key], expected[key], `comparing key '${key}' ${message || ""}`);
    }
    chai.assert.equal(!!actual.default_source, !!expected.default_source, `both have default_source set or unset ${message}`);
    chai.assert.equal(actual.sources.total_count, expected.sources.total_count, message);
    chai.assert.lengthOf(actual.sources.data, actual.sources.total_count, message);

    for (let sourceIx = 0; sourceIx < expected.sources.total_count; sourceIx++) {
        chai.assert.equal(actual.sources.data[sourceIx].object, "card", "only card checking is supported");
        chai.assert.equal(expected.sources.data[sourceIx].object, "card", "only card checking is supported");
        chai.assert.equal((actual.sources.data[sourceIx] as Stripe.cards.ICard).customer, actual.id);
        chai.assert.equal((expected.sources.data[sourceIx] as Stripe.cards.ICard).customer, expected.id);
        assertCardsAreBasicallyEqual(actual.sources.data[sourceIx] as Stripe.cards.ICard, expected.sources.data[sourceIx] as Stripe.cards.ICard, `of refund ${sourceIx} ${message || ""}`);
    }
}

const cardKeys: (keyof Stripe.cards.ICard)[] = ["object", "address_city", "address_country", "address_line1", "address_line1_check", "address_line2", "address_state", "address_zip", "address_zip_check", "brand", "country", "cvc_check", "dynamic_last4", "exp_month", "exp_year", "funding", "last4", "metadata", "name", "tokenization_method"];
export function assertCardsAreBasicallyEqual(actual: Stripe.cards.ICard, expected: Stripe.cards.ICard, message?: string): void {
    for (const key of cardKeys) {
        chai.assert.deepEqual(actual[key], expected[key], `comparing key '${key}' ${message || ""}`);
    }
}
