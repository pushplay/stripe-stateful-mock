import {buildStripeParityTest} from "./buildStripeParityTest";

describe("prices", () => {

    it("supports creating a recurring monthly price for an existing product", buildStripeParityTest(
        async (stripeClient) => {
            const product = await stripeClient.products.create({
                name: "monthly service",
                type: "service"
            });

            const price = await stripeClient.prices.create({
                unit_amount: 2000,
                currency: "usd",
                metadata: {
                    orderId: 6735
                },
                nickname: "billiam",
                product: product.id,
                recurring: {
                    interval: "month"
                }
            });

            const priceGet = await stripeClient.prices.retrieve(price.id);
            return [product, price, priceGet];
        }
    ));

    it("supports creating a recurring monthly price for a new product", buildStripeParityTest(
        async (stripeClient) => {
            const price = await stripeClient.prices.create({
                unit_amount: 2000,
                currency: "usd",
                metadata: {
                    orderId: 6735
                },
                nickname: "billiam",
                product_data: {
                    name: "another monthly service"
                },
                recurring: {
                    interval: "month"
                }
            });

            const priceGet = await stripeClient.prices.retrieve(price.id);
            const productGet = await stripeClient.products.retrieve(price.product as string);
            return [price, priceGet, productGet];
        }
    ));

    it("supports creating a one time price", buildStripeParityTest(
        async (stripeClient) => {
            const price = await stripeClient.prices.create({
                unit_amount: 3500,
                currency: "usd",
                billing_scheme: "per_unit",
                product_data: {
                    name: "one time service"
                }
            });

            const priceGet = await stripeClient.prices.retrieve(price.id);
            return [price, priceGet];
        }
    ));

    it("supports updating price", buildStripeParityTest(
        async (stripeClient) => {
            const price = await stripeClient.prices.create({
                unit_amount: 2000,
                currency: "usd",
                product_data: {
                    name: "one more time service"
                },
                recurring: {
                    interval: "month"
                }
            });

            const priceUpdate = await stripeClient.prices.update(price.id, {
                active: false,
                metadata: {orderId: 6735},
                nickname: "foobar"
            });

            const priceGet = await stripeClient.prices.retrieve(price.id);
            return [price, priceUpdate, priceGet];
        }
    ));
});
