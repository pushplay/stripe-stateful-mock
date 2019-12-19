import Stripe from "stripe";
import chai = require("chai");

export async function assertErrorThunksAreEqual(actual: () => Promise<any>, expected: () => Promise<any>, message?: string): Promise<void> {
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

    chai.assert.isDefined(actualError, `actual is rejected ${message || ""}`);
    chai.assert.isDefined(expectedError, `expected is rejected ${message || ""}`);
    assertErrorsAreEqual(actualError, expectedError, message);
}

const comparableErrorKeys = ["code", "rawType", "statusCode", "type"];
const comparableRawErrorKeys = ["code", "decline_code", "doc_url", "param", "type"];

export function assertErrorsAreEqual(actual: any, expected: any, message?: string): void {
    for (const key of comparableErrorKeys) {
        chai.assert.deepEqual(actual[key], expected[key], `comparing key '${key}' ${message || ""}`);
    }
    for (const key of comparableRawErrorKeys) {
        chai.assert.deepEqual(actual.raw[key], expected.raw[key], `comparing key 'raw.${key}' ${message || ""}`);
    }
}

export type ComparableStripeObject = Error
    | Stripe.ApiList<any>
    | Stripe.Card
    | Stripe.Charge
    | Stripe.Customer
    | Stripe.Subscription
    | Stripe.SubscriptionItem
    | Stripe.Dispute
    | Stripe.PaymentIntent
    | Stripe.Plan
    | Stripe.Product
    | Stripe.Refund;

export function assertObjectsAreBasicallyEqual(actual: ComparableStripeObject, expected: ComparableStripeObject, message?: string): void {
    chai.assert.isDefined(actual, `actual ${message}`);
    chai.assert.isNotNull(actual, `actual ${message}`);
    chai.assert.isDefined(expected, `expected ${message}`);
    chai.assert.isNotNull(expected, `expected ${message}`);

    if (actual instanceof Error) {
        chai.assert.instanceOf(expected, Error, message);
        assertErrorsAreEqual(actual, expected, message);
        return;
    }
    if (expected instanceof Error) {
        chai.assert.fail(actual as any, expected, `both should be errors ${message}`);
        return;
    }

    chai.assert.equal(actual.object, expected.object, message);
    switch (actual.object) {
        case "card":
            assertCardsAreBasicallyEqual(actual as Stripe.Card, expected as Stripe.Card, message);
            break;
        case "charge":
            assertChargesAreBasicallyEqual(actual as Stripe.Charge, expected as Stripe.Charge, message);
            break;
        case "customer":
            assertCustomersAreBasicallyEqual(actual as Stripe.Customer, expected as Stripe.Customer, message);
            break;
        case "subscription":
            assertSubscriptionsAreBasicallyEqual(actual as Stripe.Subscription, expected as Stripe.Subscription, message);
            break;
        case "subscription_item":
            assertSubscriptionItemsAreBasicallyEqual(actual as Stripe.SubscriptionItem, expected as Stripe.SubscriptionItem, message);
            break;
        case "dispute":
            assertDisputesAreBasicallyEqual(actual as Stripe.Dispute, expected as Stripe.Dispute, message);
            break;
        case "list":
            assertListsAreBasicallyEqual(actual as Stripe.ApiList<any>, expected as Stripe.ApiList<any>, message);
            break;
        case "payment_intent":
            assertPaymentIntentsAreBasicallyEqual(actual as Stripe.PaymentIntent, expected as Stripe.PaymentIntent, message);
            break;
        case "plan":
            assertPlansAreBasicallyEqual(actual as Stripe.Plan, expected as Stripe.Plan, message);
            break;
        case "product":
            assertProductsAreBasicallyEqual(actual as Stripe.Product, expected as Stripe.Product, message);
            break;
        case "refund":
            assertRefundsAreBasicallyEqual(actual as Stripe.Refund, expected as Stripe.Refund, message);
            break;
        default:
            throw new Error(`Unhandle Stripe object type: ${actual.object}`);
    }
}

export function assertListsAreBasicallyEqual<T extends ComparableStripeObject>(actual: Stripe.ApiList<T>, expected: Stripe.ApiList<T>, message?: string): void {
    chai.assert.lengthOf(actual.data, expected.data.length, message);
    chai.assert.equal(actual.has_more, expected.has_more, message);
    chai.assert.equal(actual.object, expected.object, message);

    for (let ix = 0; ix < actual.data.length; ix++) {
        assertObjectsAreBasicallyEqual(actual.data[ix], expected.data[ix], message);
    }
}

export function assertChargesAreBasicallyEqual(actual: Stripe.Charge, expected: Stripe.Charge, message?: string): void {
    chai.assert.match(actual.id, /^ch_/, `actual charge ID is formatted correctly ${message}`);

    assertEqualOnKeys(actual, expected, ["object", "amount", "amount_refunded", "application_fee", "application_fee_amount", "billing_details", "captured", "currency", "description", "failure_code", "failure_message", "metadata", "paid", "receipt_email", "refunded", "statement_descriptor", "statement_descriptor_suffix", "status", "transfer_group"], message);
    assertSetOrUnsetOnKeys(actual, expected, ["balance_transaction", "id", "payment_intent", "payment_method", "receipt_url"], message);

    assertOutcomesAreBasicallyEqual(actual.outcome, expected.outcome, message);
    assertListsAreBasicallyEqual(actual.refunds, expected.refunds, message);
}

function assertOutcomesAreBasicallyEqual(actual: Stripe.Charge.Outcome, expected: Stripe.Charge.Outcome, message?: string): void {
    assertEqualOnKeys(actual, expected, ["network_status", "reason", "risk_level", "rule", "seller_message", "type"], message);
}

export function assertRefundsAreBasicallyEqual(actual: Stripe.Refund, expected: Stripe.Refund, message?: string): void {
    assertEqualOnKeys(actual, expected, ["object", "amount", "currency", "description", "metadata", "reason", "status"], message);
}

export function assertCustomersAreBasicallyEqual(actual: Stripe.Customer, expected: Stripe.Customer, message?: string): void {
    assertEqualOnKeys(
        actual, expected, [
            "object", "account_balance", "address",
            "balance", "delinquent",
            "description", "discount", "email",
            "invoice_settings", "livemode", "metadata",
            "name", "phone", "preferred_locales",
            "shipping"
        ], message
    );
    assertSetOrUnsetOnKeys(actual, expected, ["default_source"], message);
    chai.assert.lengthOf(actual.sources.data, expected.sources.data.length, message);

    for (let sourceIx = 0; sourceIx < expected.sources.data.length; sourceIx++) {
        chai.assert.equal(actual.sources.data[sourceIx].object, "card", "only card checking is supported");
        chai.assert.equal(expected.sources.data[sourceIx].object, "card", "only card checking is supported");
        chai.assert.equal((actual.sources.data[sourceIx] as Stripe.Card).customer, actual.id);
        chai.assert.equal((expected.sources.data[sourceIx] as Stripe.Card).customer, expected.id);
        assertCardsAreBasicallyEqual(
            actual.sources.data[sourceIx] as Stripe.Card,
            expected.sources.data[sourceIx] as Stripe.Card,
            `of refund ${sourceIx} ${message || ""}`
        );
    }
}

export function assertSubscriptionsAreBasicallyEqual(
    actual: Stripe.Subscription,
    expected: Stripe.Subscription,
    message?: string
): void {
    assertEqualOnKeys(actual, expected, [
        "object", "application_fee_percent", "billing",
        "collection_method",
        "billing_thresholds", "cancel_at", "cancel_at_period_end",
        "canceled_at",
        "days_until_due", "default_payment_method",
        "default_source", "discount", "ended_at",
        "livemode", "metadata",
        "quantity", "status",
        "tax_percent", "trial_end", "trial_start"
    ], message);
    assertSetOrUnsetOnKeys(actual, expected, [
        "id", "items", "plan", "billing_cycle_anchor", "created",
        "current_period_end", "current_period_start", "customer",
        "latest_invoice", "start", "start_date"
    ], message);
    chai.assert.lengthOf(actual.items.data, expected.items.data.length, message);

    for (let itemIx = 0; itemIx < expected.items.data.length; itemIx++) {
        chai.assert.equal(actual.items.data[itemIx].object, "subscription_item");
        chai.assert.equal(expected.items.data[itemIx].object, "subscription_item");
        chai.assert.equal(
            actual.items.data[itemIx].subscription, actual.id
        );
        chai.assert.equal(
            expected.items.data[itemIx].subscription, expected.id
        );

        assertSubscriptionItemsAreBasicallyEqual(
            actual.items.data[itemIx],
            expected.items.data[itemIx],
            message
        )
    }
    chai.assert.ok(actual.plan.id);
    chai.assert.ok(expected.plan.id)
}

export function assertSubscriptionItemsAreBasicallyEqual(
    actual: Stripe.SubscriptionItem,
    expected: Stripe.SubscriptionItem,
    message: string
): void {
    assertEqualOnKeys(actual, expected, [
        "object", "billing_thresholds", "metadata", "quantity"
    ], message);
    assertSetOrUnsetOnKeys(actual, expected, [
        "created", "subscription", "plan"
    ], message);

    chai.assert.ok(actual.plan.id);
    chai.assert.ok(expected.plan.id)
}

export function assertCardsAreBasicallyEqual(actual: Stripe.Card, expected: Stripe.Card, message?: string): void {
    assertEqualOnKeys(actual, expected, ["object", "address_city", "address_country", "address_line1", "address_line1_check", "address_line2", "address_state", "address_zip", "address_zip_check", "brand", "country", "cvc_check", "dynamic_last4", "exp_month", "exp_year", "funding", "last4", "metadata", "name", "tokenization_method"], message);
    assertSetOrUnsetOnKeys(actual, expected, ["fingerprint", "id"], message);
}

export function assertDisputesAreBasicallyEqual(actual: Stripe.Dispute, expected: Stripe.Dispute, message?: string): void {
    assertEqualOnKeys(actual, expected, ["object", "amount", "currency", "is_charge_refundable", "livemode", "metadata", "reason", "status"], message);
    assertSetOrUnsetOnKeys(actual, expected, ["id"], message);
}

export function assertPaymentIntentsAreBasicallyEqual(actual: Stripe.PaymentIntent, expected: Stripe.PaymentIntent, message?: string): void {
    assertEqualOnKeys(actual, expected, ["object", "amount", "amount_capturable", "amount_received", "application_fee_amount", "canceled_at", "cancellation_reason", "capture_method", "confirmation_method", "currency", "description", "livemode", "metadata", "on_behalf_of", "payment_method_types", "receipt_email", "setup_future_usage", "shipping", "statement_descriptor", "status"], message);
    assertSetOrUnsetOnKeys(actual, expected, ["customer", "last_payment_error", "next_action", "payment_method", "review", "transfer_data", "transfer_group"], message);
}

export function assertPlansAreBasicallyEqual(actual: Stripe.Plan, expected: Stripe.Plan, message?: string): void {
    assertEqualOnKeys(actual, expected, ["object", "active", "aggregate_usage", "amount", "billing_scheme", "currency", "interval", "interval_count", "livemode", "metadata", "nickname", "tiers", "tiers_mode", "transform_usage", "trial_period_days", "usage_type"], message);
    assertSetOrUnsetOnKeys(actual, expected, ["id", "product"], message);
}

export function assertProductsAreBasicallyEqual(actual: Stripe.Product, expected: Stripe.Product, message?: string): void {
    assertEqualOnKeys(actual, expected, ["object", "name", "type", "active", "attributes", "caption", "deactivated_on", "description", "images", "metadata", "package_dimensions", "shippable", "url"], message);
    assertSetOrUnsetOnKeys(actual, expected, ["id"], message);
}

function assertEqualOnKeys<T extends object>(actual: T, expected: T, keys: (keyof T)[], message?: string): void {
    for (const key of keys) {
        chai.assert.deepEqual(actual[key], expected[key], `comparing key '${key}' ${message || ""}`);
    }
}

function assertSetOrUnsetOnKeys<T extends object>(actual: T, expected: T, keys: (keyof T)[], message?: string): void {
    for (const key of keys) {
        chai.assert.equal(!!actual[key], !!expected[key], `both have key '${key}' set or unset ${message || ""}`);
    }
}
