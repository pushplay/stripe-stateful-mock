import {buildStripeParityTest} from "./buildStripeParityTest";

describe("taxRates", () => {

    it("supports creating a taxRate", buildStripeParityTest(
        async (stripeClient) => {
            const taxRate = await stripeClient.taxRates.create({
                display_name: "VAT",
                description: "VAT Germany",
                jurisdiction: "DE",
                percentage: 19,
                inclusive: false,
            });
            const taxRateGet = await stripeClient.taxRates.retrieve(taxRate.id);
            return [taxRate, taxRateGet];
        }
    ));

    it("supports updating a taxRate", buildStripeParityTest(
        async (stripeClient) => {
            const taxRate = await stripeClient.taxRates.create({
                display_name: "VAT",
                description: "VAT Germany",
                jurisdiction: "DE",
                percentage: 19,
                inclusive: false,
            });
            const taxRateUpdate = await stripeClient.taxRates.update(taxRate.id, {active: false});
            const taxRateGet = await stripeClient.taxRates.retrieve(taxRate.id);
            return [taxRate, taxRateUpdate, taxRateGet];
        }
    ));
});
