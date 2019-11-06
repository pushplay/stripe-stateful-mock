import * as stripe from "stripe";
import log = require("loglevel");
import {AccountData} from "./AccountData";
import {applyListOptions, generateId, stringifyMetadata} from "./utils";
import {StripeError} from "./StripeError";
import {verify} from "./verify";
import {products} from "./products";

export namespace plans {

    const accountPlans = new AccountData<stripe.plans.IPlan>();

    export function create(accountId: string, params: stripe.plans.IPlanCreationOptions): stripe.plans.IPlan {
        log.debug("plans.create", accountId, params);

        verify.requiredParams(params, ["currency", "interval", "product"]);
        verify.requiredValue(params, "billing_scheme", ["per_unit", "tiered", null, undefined]);
        verify.requiredValue(params, "interval", ["day", "month", "week", "year"]);
        verify.requiredValue(params, "usage_type", ["licensed", "metered", null, undefined]);
        verify.currency(params.currency, "currency");

        const planId = params.id || `plan_${generateId(14)}`;
        if (accountPlans.contains(accountId, planId)) {
            throw new StripeError(400, {
                code: "resource_already_exists",
                doc_url: "https://stripe.com/docs/error-codes/resource-already-exists",
                message: "Plan already exists.",
                type: "invalid_request_error"
            });
        }

        let product: stripe.products.IProduct;
        if (typeof params.product === "string") {
            product = products.retrieve(accountId, params.product, "product");
            if (product.type !== "service") {
                throw new StripeError(400, {
                    message: `Plans may only be created with products of type \`service\`, but the supplied product (\`${product.id}\`) had type \`${product.type}\`.`,
                    param: "product",
                    type: "invalid_request_error"
                });
            }
        } else {
            product = products.create(accountId, {
                ...params.product,
                type: "service"
            });
        }

        const billingScheme = params.billing_scheme || "per_unit";
        const usageType = params.usage_type || "licensed";
        const plan: stripe.plans.IPlan = {
            id: planId,
            object: "plan",
            active: params.hasOwnProperty("active") ? (params as any).active : true,
            aggregate_usage: usageType === "metered" ? params.aggregate_usage || "sum" : null,
            amount: billingScheme === "per_unit" ? +params.amount : null,
            billing_scheme: billingScheme,
            created: (Date.now() / 1000) | 0,
            currency: params.currency,
            interval: params.interval,
            interval_count: params.interval_count || 1,
            livemode: false,
            metadata: stringifyMetadata(params.metadata),
            nickname: params.nickname || null,
            product: product.id,
            tiers: params.tiers || null,
            tiers_mode: params.tiers_mode || null,
            transform_usage: params.transform_usage || null,
            trial_period_days: params.trial_period_days || null,
            usage_type: usageType
        };
        accountPlans.put(accountId, plan);
        return plan;
    }

    export function retrieve(accountId: string, planId: string, paramName: string): stripe.plans.IPlan {
        log.debug("plans.retrieve", accountId, planId);

        const plan = accountPlans.get(accountId, planId);
        if (!plan) {
            throw new StripeError(404, {
                code: "resource_missing",
                doc_url: "https://stripe.com/docs/error-codes/resource-missing",
                message: `No such plan: ${planId}`,
                param: paramName,
                type: "invalid_request_error"
            });
        }
        return plan;
    }

    export function list(accountId: string, params: stripe.IListOptions): stripe.IList<stripe.plans.IPlan> {
        log.debug("plans.list", accountId, params);

        let data = accountPlans.getAll(accountId);
        return applyListOptions(data, params, (id, paramName) => retrieve(accountId, id, paramName));
    }
}
