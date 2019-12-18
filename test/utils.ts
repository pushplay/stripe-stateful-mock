import Stripe from "stripe";
import * as chai from "chai";
import {optionalsToNulls} from "../src/api/utils";

describe.only("utils", () => {
    describe("optionalsToNulls()", () => {
        it("returns undefined if params is undefined", () => {
            const res = optionalsToNulls(undefined, {
                flat_amount: null,
                flat_amount_decimal: null,
                unit_amount: null,
                unit_amount_decimal: null,
                up_to: null
            });
            chai.assert.isUndefined(res);
        });

        it("returns null if params is null", () => {
            const res = optionalsToNulls(null, {
                flat_amount: null,
                flat_amount_decimal: null,
                unit_amount: null,
                unit_amount_decimal: null,
                up_to: null
            });
            chai.assert.isNull(res);
        });

        it("can make optional PlanCreateParams.Tier members nulls", () => {
            const createTierParams: Stripe.PlanCreateParams.Tier = {
                flat_amount: 500,
                up_to: 999
            };
            const tier: Stripe.Plan.Tier = optionalsToNulls(createTierParams, {
                flat_amount: null,
                flat_amount_decimal: null,
                unit_amount: null,
                unit_amount_decimal: null,
                up_to: null
            });
            chai.assert.deepEqual(tier, {
                flat_amount: 500,
                flat_amount_decimal: null,
                unit_amount: null,
                unit_amount_decimal: null,
                up_to: 999
            });
        });
    });
});
