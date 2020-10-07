import {buildStripeParityTest} from "./buildStripeParityTest";

describe("plans", () => {

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
            const planGetExpanded = await stripeClient.plans.retrieve(plan.id, {expand: ["tiers"]});
            return [product, plan, planGet, planGetExpanded];
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
            const planGetExpanded = await stripeClient.plans.retrieve(plan.id, {expand: ["tiers"]});
            const productGet = await stripeClient.products.retrieve(plan.product as string);
            return [plan, planGet, planGetExpanded, productGet];
        }
    ));

    it("supports creating a plan with tiers", buildStripeParityTest(
        async (stripeClient) => {
            const plan = await stripeClient.plans.create({
                currency: "cad",
                billing_scheme: "tiered",
                interval: "day",
                product: {
                    name: "brand new service"
                },
                tiers: [
                    {
                        unit_amount: 100,
                        up_to: 1
                    },
                    {
                        unit_amount_decimal: "90",
                        up_to: 2
                    },
                    {
                        flat_amount_decimal: "80",
                        up_to: 3
                    },
                    {
                        flat_amount: 70,
                        up_to: "inf"
                    }
                ],
                tiers_mode: "graduated",
                expand: ["tiers"]
            });
            const planGet = await stripeClient.plans.retrieve(plan.id);
            const planGetExpanded = await stripeClient.plans.retrieve(plan.id, {expand: ["tiers"]});
            return [plan, planGet, planGetExpanded];
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
