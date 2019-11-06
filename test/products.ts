import {buildStripeParityTest} from "./buildStripeParityTest";

describe("products", () => {

    it("supports creating a good", buildStripeParityTest(
        async (stripeClient) => {
            const product = await stripeClient.products.create({
                name: "creating a good test",
                type: "good",
                description: "I am a good.",
            });
            const productGet = await stripeClient.products.retrieve(product.id);
            const productListById = await stripeClient.products.list({ids: [product.id]});
            return [product, productGet, productListById];
        }
    ));

    it("supports creating a service", buildStripeParityTest(
        async (stripeClient) => {
            const product = await stripeClient.products.create({
                name: "creating a service test",
                type: "service",
                metadata: {
                    foo: "bar"
                }
            });
            const productGet = await stripeClient.products.retrieve(product.id);
            const productListById = await stripeClient.products.list({ids: [product.id]});
            return [product, productGet, productListById];
        }
    ));

    it("verifies the product type is valid", buildStripeParityTest(
        async (stripeClient) => {
            let err;
            try {
                await stripeClient.products.create({
                    name: "creating a soul test",
                    type: "soul"
                } as any);
            } catch (e) {
                err = e;
            }

            return [err];
        }
    ));
});
