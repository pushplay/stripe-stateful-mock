import {buildStripeParityTest} from "./buildStripeParityTest";

describe("plan", () => {

    it("supports creating a plan with an existing product", buildStripeParityTest(
        async (stripeClient) => {
            const product = await stripeClient.products.create({
                name: "creating a plan test",
                type: "service"
            });

            const plan = await stripeClient.plans.create({
                currency: "cad",
                interval: "day",
                amount: 500,
                product: product.id
            });
            const planGet = await stripeClient.plans.retrieve(plan.id);
            return [product, plan, planGet];
        }
    ));

    it("supports creating a plan with a new product", buildStripeParityTest(
        async (stripeClient) => {
            const plan = await stripeClient.plans.create({
                currency: "cad",
                interval: "day",
                amount: 500,
                product: {
                    name: "brand new service"
                }
            });
            const planGet = await stripeClient.plans.retrieve(plan.id);
            const productGet = await stripeClient.products.retrieve(plan.product as string);
            return [plan, planGet, productGet];
        }
    ));

    it("verifies the plan interval is valid", buildStripeParityTest(
        async (stripeClient) => {
            let err;
            try {
                await stripeClient.plans.create({
                    currency: "cad",
                    interval: "day-o",
                    amount: 500,
                    product: {
                        name: "brand new service"
                    }
                } as any);
            } catch (e) {
                err = e;
            }

            return [err];
        }
    ));

    it("verifies the plan currency is valid", buildStripeParityTest(
        async (stripeClient) => {
            let err;
            try {
                await stripeClient.plans.create({
                    currency: "souls",
                    interval: "day",
                    amount: 500,
                    product: {
                        name: "brand new service"
                    }
                } as any);
            } catch (e) {
                err = e;
            }

            return [err];
        }
    ));
});
