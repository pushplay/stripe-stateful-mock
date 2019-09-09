import * as chai from "chai";
import * as stripe from "stripe";
import {generateId} from "../src/api/utils";
import {buildStripeParityTest} from "./buildStripeParityTest";

describe.only("customers", () => {

    it("supports basic creation with no params", buildStripeParityTest(
        async (stripeClient) => {
            const customer = await stripeClient.customers.create({});
            const customerGet = await stripeClient.customers.retrieve(customer.id);
            return [customer, customerGet];
        }
    ));

    it("supports creating with a specific ID", buildStripeParityTest(
        async (stripeClient) => {
            // This isn't documented anywhere but it does work.
            const id = `cus_${generateId()}`;
            const customer = await stripeClient.customers.create({id} as any);
            chai.assert.equal(customer.id, id);
            const customerGet = await stripeClient.customers.retrieve(customer.id);
            chai.assert.equal(customerGet.id, id);
            return [customer];
        }
    ));

    it("creating and charging a default source", buildStripeParityTest(
        async (stripeClient) => {
            const customer = await stripeClient.customers.create({
                source: "tok_visa"
            });
            const charge = await stripeClient.charges.create({
                currency: "usd",
                amount: 8675309,
                customer: customer.id
            });
            return [customer, charge];
        }
    ));

    it("supports creating and charging an additional source", buildStripeParityTest(
        async (stripeClient) => {
            const customer = await stripeClient.customers.create({
                source: "tok_mastercard"
            });
            const additionalSource = await stripeClient.customers.createSource(customer.id, {
                source: "tok_visa"
            }) as stripe.cards.ICard;
            const customerWithAdditionalSource = await stripeClient.customers.retrieve(customer.id);
            const charge = await stripeClient.charges.create({
                amount: 1000,
                currency: "usd",
                customer: customer.id,
                source: additionalSource.id
            });

            chai.assert.notEqual(additionalSource.id, customer.default_source);
            chai.assert.equal(customerWithAdditionalSource.default_source, customerWithAdditionalSource.sources.data[0].id);
            chai.assert.equal(customerWithAdditionalSource.sources.data[1].id, additionalSource.id);
            return [customer, additionalSource, customerWithAdditionalSource, charge];
        }
    ));

    it("errors on charging an invalid non-default source", buildStripeParityTest(
        async (stripeClient) => {
            const customer = await stripeClient.customers.create({
                source: "tok_visa"
            });
            let chargeError: any = null;
            try {
                await stripeClient.charges.create({
                    currency: "usd",
                    amount: 8675309,
                    customer: customer.id,
                    source: `invalid-${generateId(12)}`
                });
            } catch (err) {
                chargeError = err;
            }
            return [customer, chargeError];
        }
    ));

    it("supports tok_chargeDeclined", buildStripeParityTest(
        async (stripeClient) => {
            let customerError: any = null;
            try {
                await stripeClient.customers.create({
                    source: "tok_chargeDeclined"
                });
            } catch (err) {
                customerError = err;
            }
            return [customerError];
        }
    ));

    it("supports tok_chargeDeclinedInsufficientFunds", buildStripeParityTest(
        async (stripeClient) => {
            let customerError: any = null;
            try {
                await stripeClient.customers.create({
                    source: "tok_chargeDeclinedInsufficientFunds"
                });
            } catch (err) {
                customerError = err;
            }
            return [customerError];
        }
    ));

    it("supports tok_chargeDeclinedIncorrectCvc", buildStripeParityTest(
        async (stripeClient) => {
            let customerError: any = null;
            try {
                await stripeClient.customers.create({
                    source: "tok_chargeDeclinedIncorrectCvc"
                });
            } catch (err) {
                customerError = err;
            }
            return [customerError];
        }
    ));

    it("supports tok_chargeDeclinedIncorrectCvc", buildStripeParityTest(
        async (stripeClient) => {
            let customerError: any = null;
            try {
                await stripeClient.customers.create({
                    source: "tok_chargeDeclinedIncorrectCvc"
                });
            } catch (err) {
                customerError = err;
            }
            return [customerError];
        }
    ));

    it("supports tok_chargeDeclinedExpiredCard", buildStripeParityTest(
        async (stripeClient) => {
            let customerError: any = null;
            try {
                await stripeClient.customers.create({
                    source: "tok_chargeDeclinedExpiredCard"
                });
            } catch (err) {
                customerError = err;
            }
            return [customerError];
        }
    ));

    it("supports tok_chargeCustomerFail", buildStripeParityTest(
        async (stripeClient) => {
            const customer = await stripeClient.customers.create({
                source: "tok_chargeCustomerFail"
            });
            let chargeError: any = null;
            try {
                await stripeClient.charges.create({
                    currency: "usd",
                    amount: 8675309,
                    customer: customer.id
                });
            } catch (err) {
                chargeError = err;
            }
            return [customer, chargeError];
        }
    ));

    it("supports Stripe-Account header (Connect account)", buildStripeParityTest(
        async (stripeClient) => {
            const params: stripe.customers.ICustomerCreationOptions =  {
                source: "tok_visa"
            };

            chai.assert.isString(process.env["STRIPE_CONNECTED_ACCOUNT_ID"], "connected account ID is set");

            const customer = await stripeClient.customers.create(params, {stripe_account: process.env["STRIPE_CONNECTED_ACCOUNT_ID"]});

            let retrieveError: any;
            try {
                await stripeClient.customers.retrieve(customer.id);
            } catch (err) {
                retrieveError = err;
            }
            chai.assert.isDefined(retrieveError, "customer should not be in the account, but should be in the connected account");

            const connectRetrieveCustomer = await stripeClient.customers.retrieve(customer.id, {stripe_account: process.env["STRIPE_CONNECTED_ACCOUNT_ID"]});
            chai.assert.deepEqual(connectRetrieveCustomer, customer);

            const connectRetrieveCard = await stripeClient.customers.retrieveSource(customer.id, customer.default_source as string, {stripe_account: process.env["STRIPE_CONNECTED_ACCOUNT_ID"]}) as stripe.cards.ICard;
            chai.assert.equal(connectRetrieveCard.id, customer.default_source as string);

            return [customer, retrieveError, connectRetrieveCustomer, connectRetrieveCard];
        }
    ));
});
