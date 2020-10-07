import Stripe from "stripe";
import {AccountData} from "./AccountData";
import {applyListOptions, generateId, stringifyMetadata} from "./utils";
import {RestError} from "./RestError";
import {verify} from "./verify";
import {products} from "./products";
import log = require("loglevel");

export namespace plans {

    const accountPlans = new AccountData<Stripe.Plan>();

    export function create(accountId: string, params: Stripe.PlanCreateParams): Stripe.Plan {
        log.debug("plans.create", accountId, params);

        verify.requiredParams(params, ["currency", "interval", "product"]);
        verify.requiredValue(params, "billing_scheme", ["per_unit", "tiered", null, undefined]);
        verify.requiredValue(params, "interval", ["day", "month", "week", "year"]);
        verify.requiredValue(params, "usage_type", ["licensed", "metered", null, undefined]);
        verify.currency(params.currency, "currency");

        const planId = params.id || `plan_${generateId(14)}`;
        if (accountPlans.contains(accountId, planId)) {
            throw new RestError(400, {
                code: "resource_already_exists",
                doc_url: "https://stripe.com/docs/error-codes/resource-already-exists",
                message: "Plan already exists.",
                type: "invalid_request_error"
            });
        }

        let product: Stripe.Product;
        if (typeof params.product === "string") {
            product = products.retrieve(accountId, params.product, "product");
            if (product.type !== "service") {
                throw new RestError(400, {
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

        const billingScheme = params.billing_scheme ?? "per_unit";
        const usageType = params.usage_type ?? "licensed";
        const plan: Stripe.Plan = {
            id: planId,
            object: "plan",
            active: Object.prototype.hasOwnProperty.call(params, "active") ? (params as any).active : true,
            aggregate_usage: usageType === "metered" ? params.aggregate_usage || "sum" : null,
            amount: billingScheme === "per_unit" ? +params.amount : null,
            amount_decimal: billingScheme === "per_unit" ? (+params.amount / 100) + "" : null,
            billing_scheme: billingScheme,
            created: (Date.now() / 1000) | 0,
            currency: params.currency,
            interval: params.interval,
            interval_count: params.interval_count || 1,
            livemode: false,
            metadata: stringifyMetadata(params.metadata),
            nickname: params.nickname ?? null,
            product: product.id,
            tiers: billingScheme === "tiered" ? params.tiers?.map(tierCreateToTier) : undefined,
            tiers_mode: billingScheme === "tiered" ? params.tiers_mode : null,
            transform_usage: params.transform_usage ?? null,
            trial_period_days: params.trial_period_days ?? null,
            usage_type: usageType
        };
        accountPlans.put(accountId, plan);
        return plan;
    }

    /**
     * Coalesce the number amount (which may be passed in as a string) and the
     * string decimal amount into a number value.
     *
     * If this garbage needs to happen in more places refactor it into utils.
     */
    function coalesceToAmount(amount?: string | number, decimal?: string): number | null {
        if (!isNaN(+amount)) {
            return +amount;
        }
        if (!isNaN(+decimal)) {
            return +decimal;
        }
        return null;
    }

    /**
     * Coalesce the number amount (which may be passed in as a string) and the
     * string decimal amount into a string decimal value.
     *
     * If this garbage needs to happen in more places refactor it into utils.
     */
    function coalesceToDecimal(amount?: string | number, decimal?: string): string | null {
        if (!isNaN(+amount)) {
            return +amount + "";
        }
        if (decimal) {
            return decimal;
        }
        return null;
    }

    function tierCreateToTier(tier: Stripe.PlanCreateParams.Tier): Stripe.Plan.Tier {
        return {
            flat_amount: coalesceToAmount(tier.flat_amount, tier.flat_amount_decimal),
            flat_amount_decimal: coalesceToDecimal(tier.flat_amount, tier.flat_amount_decimal),
            unit_amount: coalesceToAmount(tier.unit_amount, tier.unit_amount_decimal),
            unit_amount_decimal: coalesceToDecimal(tier.unit_amount, tier.unit_amount_decimal),
            up_to: +tier.up_to || null
        };
    }

    export function retrieve(accountId: string, planId: string, paramName: string): Stripe.Plan {
        log.debug("plans.retrieve", accountId, planId);

        const plan = accountPlans.get(accountId, planId);
        if (!plan) {
            throw new RestError(404, {
                code: "resource_missing",
                doc_url: "https://stripe.com/docs/error-codes/resource-missing",
                message: `No such plan: ${planId}`,
                param: paramName,
                type: "invalid_request_error"
            });
        }
        return plan;
    }

    export function list(accountId: string, params: Stripe.PaginationParams): Stripe.ApiList<Stripe.Plan> {
        log.debug("plans.list", accountId, params);

        const data = accountPlans.getAll(accountId);
        return applyListOptions(data, params, (id, paramName) => retrieve(accountId, id, paramName));
    }
}
