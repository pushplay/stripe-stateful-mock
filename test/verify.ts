import * as chai from "chai";
import Stripe from "stripe";
import {verify} from "../src/api/verify";
import {RestError} from "../src/api/RestError";

describe("verify", () => {
    describe("requiredParams", () => {
        it("doesn't throw an error if all required params are present", () => {
            const params: Stripe.CustomerSourceCreateParams = {
                source: "tok_visa"
            };
            verify.requiredParams(params, ["source"]);
        });

        it("throws an error if a required param is missing", () => {
            const params: any = {};
            let error: RestError = null;
            try {
                verify.requiredParams(params, ["source"]);
            } catch (e) {
                error = e;
            }
            chai.assert.instanceOf(error, RestError);
            chai.assert.equal(error.error.param, "source");
        });

        it("doesn't throw an error if all required nested params are present", () => {
            const params: Stripe.CustomerSourceCreateParams = {
                source: {
                    object: "card",
                    number: "1234",
                    exp_month: 1,
                    exp_year: 1999
                } as any
            };
            verify.requiredParams(params, ["source", "source[object]", "source[number]", "source[exp_month]", "source[exp_year]"]);
        });

        it("throws an error if a nested param is missing", () => {
            const params: any = {
                source: {
                    object: "card",
                    number: "1234",
                    exp_month: 1
                }
            };
            let error: RestError = null;
            try {
                verify.requiredParams(params, ["source", "source[object]", "source[number]", "source[exp_month]", "source[exp_year]"]);
            } catch (e) {
                error = e;
            }
            chai.assert.instanceOf(error, RestError);
            chai.assert.equal(error.error.param, "source[exp_year]");
        });
    });
});
