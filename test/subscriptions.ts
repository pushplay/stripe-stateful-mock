import * as chai from "chai";
import {buildStripeParityTest} from "./buildStripeParityTest";
import { getLocalStripeClient } from "./stripeUtils"

describe("subscriptions", function () {

    const localStripeClient = getLocalStripeClient()
    const TEST_PLAN = process.env.STRIPE_TEST_PLAN_ID
    if (!TEST_PLAN) {
        throw new Error('STRIPE_TEST_PLAN_ID is not set...')
    }

    this.timeout(30 * 1000);

    it.skip("supports basic creation with no params", buildStripeParityTest(
        async (stripeClient) => {
            const customer = await stripeClient
                .customers.create({
                    source: "tok_visa"
                })

            const subscription = await stripeClient
                .subscriptions.create({
                    customer: customer.id,
                    items: [{
                        plan: TEST_PLAN,
                        quantity: 1
                    }]
                })
            const subscriptionGet = await stripeClient
                .subscriptions.retrieve(subscription.id);

            chai.assert.equal(subscriptionGet.customer, customer.id);
            chai.assert.equal(
                subscriptionGet.plan.id,
                subscriptionGet.items.data[0].plan.id
            );
            chai.assert.equal(
                subscriptionGet.id,
                subscriptionGet.items.data[0].subscription
            )

            return [subscription, subscriptionGet];
        }
    ))

    it("supports updating the quantity", buildStripeParityTest(
        async (stripeClient) => {
            const customer = await stripeClient.customers.create({
                source: "tok_visa"
            })
            console.log('attempt create')
            const subscription = await stripeClient.subscriptions
                .create({
                    customer: customer.id,
                    items: [{
                        plan: TEST_PLAN,
                        quantity: 1
                    }]
                })

            console.log('attempt update')
            const updated = await stripeClient.subscriptions
                .update(subscription.id, {
                    items: [{
                        quantity: 5
                    }]
                })

            const subscriptionGet = await stripeClient.subscriptions
                .retrieve(subscription.id);

            chai.assert.equal(subscriptionGet.items.data[0].quantity, 5);

            return [updated, subscriptionGet]
        }
    ))

    it("supports fetching subscriptions from customer", buildStripeParityTest(
        async (stripeClient) => {
            const customer = await stripeClient.customers.create({
                source: "tok_visa"
            })
            const subscription = await stripeClient.subscriptions
                .create({
                    customer: customer.id,
                    items: [{
                        plan: TEST_PLAN,
                        quantity: 1
                    }]
                })

            const customerGet = await stripeClient.customers
                .retrieve(customer.id);

            console.log("customerGet", customerGet);

            chai.assert.equal(customerGet.subscriptions.total_count, 1)
            chai.assert.equal(customerGet.subscriptions.data[0].id, subscription.id);

            return [customerGet]
        }
    ))
})
