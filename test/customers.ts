import * as chai from "chai";
import * as stripe from "stripe";
import {getLocalStripeClient} from "./stripeUtils";
import {generateId} from "../src/api/utils";

describe.only("customers", () => {

    it("can create a customer with a specific ID", async () => {
        const customerId = `cus_${generateId()}`;
        const customer = await getLocalStripeClient().customers.create({
            id: customerId
        } as any);

        chai.assert.isDefined(customer);
        chai.assert.equal(customer.id, customerId);

        const customerGet = await getLocalStripeClient().customers.retrieve(customerId);
        chai.assert.deepEqual(customerGet, customer);
    });

    it.only("can create a customer with a source token and then charge it", async () => {
        const customer = await getLocalStripeClient().customers.create({
            source: "tok_visa"
        });

        chai.assert.isDefined(customer);
        chai.assert.lengthOf(customer.sources.data, 1);
        chai.assert.equal(customer.sources.total_count, customer.sources.data.length);
        chai.assert.equal(customer.sources.data[0].id, customer.default_source);
        chai.assert.equal(customer.sources.data[0].customer, customer.id);
        chai.assert.equal((customer.sources.data[0] as stripe.cards.ICard).brand, "Visa");
        chai.assert.equal((customer.sources.data[0] as stripe.cards.ICard).last4, "4242");

        const charge = await getLocalStripeClient().charges.create({
            customer: customer.id,
            currency: "usd",
            amount: 3200
        });
        chai.assert.equal(charge.amount, 3200);
        chai.assert.deepEqual(charge.source, customer.sources.data[0] as stripe.cards.ICard);
    });

    it("can create a customer with source token tok_chargeCustomerFail and then fail to charge it", async () => {
        const customer = await getLocalStripeClient().customers.create({
            source: "tok_chargeCustomerFail"
        });

        chai.assert.isDefined(customer);
        chai.assert.lengthOf(customer.sources.data, 1);
        chai.assert.equal(customer.sources.total_count, customer.sources.data.length);
        chai.assert.equal(customer.sources.data[0].id, customer.default_source);
        chai.assert.equal(customer.sources.data[0].customer, customer.id);
        chai.assert.equal((customer.sources.data[0] as stripe.cards.ICard).brand, "Visa");
        chai.assert.equal((customer.sources.data[0] as stripe.cards.ICard).last4, "4242");

        const charge = await getLocalStripeClient().charges.create({
            customer: customer.id,
            currency: "usd",
            amount: 3200
        });
        chai.assert.equal(charge.amount, 3200);
        chai.assert.deepEqual(charge.source, customer.sources.data[0] as stripe.cards.ICard);
    });
});
