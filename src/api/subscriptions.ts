import Stripe from "stripe";
import {AccountData} from "./AccountData";
import {StripeError} from "./StripeError";
import {applyListParams, generateId, stringifyMetadata} from "./utils";
import {customers} from "./customers";
import log = require("loglevel");

export namespace subscriptions {

    const accountSubscriptions = new AccountData<Stripe.Subscription>();
    const accountSubscriptionItems = new AccountData<Stripe.SubscriptionItem>();
    const accountPlans = new AccountData<Stripe.Plan>();

    export function create(accountId: string, params: Stripe.SubscriptionCreateParams): Stripe.Subscription {
        log.debug("subscriptions.create", accountId, params);

        const paramId = (params as any).id;
        if (paramId && accountSubscriptions.contains(accountId, paramId)) {
            throw new StripeError(400, {
                code: "resource_already_exists",
                doc_url: "https://stripe.com/docs/error-codes/resource-already-exists",
                message: "Subscription already exists.",
                type: "invalid_request_error"
            });
        }

        let default_source: string;
        const paramsDefaultSource = params.default_source;
        if (paramsDefaultSource && typeof paramsDefaultSource !== "string") {
            const customer = params.customer;
            const card = customers.createCard(accountId, customer, {
                source: paramsDefaultSource
            });
            default_source = card.id;
        } else if (typeof paramsDefaultSource === "string") {
            default_source = paramsDefaultSource;
        }

        let plan = params.plan;
        if (!plan) {
            plan = params.items[0].plan;
        }

        const subscriptionId = paramId || `sub_${generateId(14)}`;
        const now = Math.floor((Date.now() / 1000));
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1);

        let paramQuantity = +params.quantity;
        if (!params.quantity && params.items.length === 1) {
            paramQuantity = +params.items[0].quantity;
        }

        const subscription: Stripe.Subscription = {
            id: subscriptionId,
            object: "subscription",
            application_fee_percent: +params.application_fee_percent || null,
            billing: params.billing || "charge_automatically",
            collection_method: params.billing || "charge_automatically",
            billing_cycle_anchor: +params.billing_cycle_anchor || now,
            billing_thresholds: null,
            cancel_at: null,
            cancel_at_period_end: false,
            canceled_at: null,
            created: now,
            current_period_end: Math.floor(nextMonth.getTime() / 1000),
            /** Hard coded to assume month long subscriptions */
            current_period_start: now,
            customer: params.customer,
            days_until_due: +params.days_until_due || null,
            default_payment_method: null,
            default_source: default_source || null,
            /*default_tax_rates*/
            discount: null,
            ended_at: null,
            items: {
                object: "list",
                total_count: params.items ? params.items.length : 0,
                data: [],
                has_more: false,
                url: `/v1/subscription_items?subscription=${subscriptionId}`
            },
            latest_invoice: `in_${generateId(14)}`,
            livemode: false,
            metadata: stringifyMetadata(params.metadata),
            plan: getOrCreatePlanObj(accountId, plan),
            quantity: paramQuantity || 1,
            start: Math.floor(Date.now() / 1000),
            start_date: Math.floor(Date.now() / 1000),
            status: "active",
            tax_percent: +params.tax_percent || null,
            trial_end: null,
            trial_start: null
        };

        if (params.items) {
            for (const item of params.items) {
                subscription.items.data.push(
                    createItem(accountId, item, subscription.id)
                );
            }
        }

        accountSubscriptions.put(accountId, subscription);
        customers.addSubscription(
            accountId,
            typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id,
            subscription
        );

        return subscription;
    }

    function getOrCreatePlanObj(accountId: string, planName: string): Stripe.Plan {
        if (accountPlans.contains(accountId, planName)) {
            return accountPlans.get(accountId, planName);
        }

        const plan: Stripe.Plan = {
            id: planName,
            object: "plan",
            active: true,
            aggregate_usage: null,
            amount: 10 * 100,
            amount_decimal: (10 * 100) + "",
            billing_scheme: "per_unit",
            created: Math.floor(Date.now() / 1000),
            currency: "usd",
            interval: "month",
            interval_count: 1,
            livemode: false,
            metadata: {},
            nickname: null,
            product: `prod_${planName.substr(5)}`,
            tiers: null,
            tiers_mode: null,
            transform_usage: null,
            trial_period_days: null,
            usage_type: "licensed"
        };
        accountPlans.put(accountId, plan);

        return plan;
    }

    function createItem(accountId: string, params: Stripe.SubscriptionItemCreateParams, subscriptionId: string): Stripe.SubscriptionItem {
        const paramId = (params as any).id;
        const subItemId = paramId || `si_${generateId(14)}`;

        const subscriptionItem: Stripe.SubscriptionItem = {
            object: "subscription_item",
            id: subItemId,
            billing_thresholds: null,
            created: Math.floor(Date.now() / 1000),
            metadata: stringifyMetadata(params.metadata),
            plan: getOrCreatePlanObj(accountId, params.plan),
            quantity: +params.quantity || 1,
            subscription: subscriptionId,
            tax_rates: null     // TODO support
        };
        accountSubscriptionItems.put(accountId, subscriptionItem);

        return subscriptionItem;
    }

    /**
     * TODO: export function update()
     */

    export function updateItem(accountId: string, subscriptionItemId: string, params: Stripe.SubscriptionItemUpdateParams): Stripe.SubscriptionItem {
        log.debug("subscriptionITems.update", accountId, subscriptionItemId, params);

        const subscriptionItem = retrieveItem(accountId, subscriptionItemId, "id");

        if (params.quantity) {
            subscriptionItem.quantity = +params.quantity;

            const sub = retrieve(accountId, subscriptionItem.subscription, "id");
            if (sub.items.data.length === 1) {
                sub.quantity = +params.quantity;
            }
        }

        return subscriptionItem;
    }

    export function retrieve(accountId: string, subscriptionId: string, paramName: string): Stripe.Subscription {
        log.debug("subscriptions.retrieve");

        const subscription = accountSubscriptions.get(
            accountId, subscriptionId
        );
        if (!subscription) {
            throw new StripeError(404, {
                code: "resource_missing",
                doc_url: "https://stripe.com/docs/error-codes/resource-missing",
                message: `No such subscription: ${subscriptionId}`,
                param: paramName,
                type: "invalid_request_error"
            });
        }
        return subscription;
    }

    export function retrieveItem(accountId: string, subscriptionItemId: string, paramName: string): Stripe.SubscriptionItem {
        log.debug("subscriptionItems.retrieve");

        const subscriptionItem = accountSubscriptionItems.get(
            accountId, subscriptionItemId
        );
        if (!subscriptionItem) {
            throw new StripeError(404, {
                code: "resource_missing",
                doc_url: "https://stripe.com/docs/error-codes/resource-missing",
                message: `No such subscription_item: ${subscriptionItemId}`,
                param: paramName,
                type: "invalid_request_error"
            });
        }
        return subscriptionItem;
    }

    export function list(accountId: string, params: Stripe.SubscriptionListParams): Stripe.ApiList<Stripe.Subscription> {
        let data = accountSubscriptions.getAll(accountId);
        if (params.customer) {
            data = data.filter(d => {
                if (typeof d.customer === "string") {
                    return d.customer === params.customer;
                } else {
                    return d.customer.id === params.customer;
                }
            });
        }

        return applyListParams(data, params, (id, paramName) => {
            return retrieve(accountId, id, paramName);
        });
    }

    export function listItem(accountId: string, params: Stripe.SubscriptionItemListParams): Stripe.ApiList<Stripe.SubscriptionItem> {
        let data = accountSubscriptionItems.getAll(accountId);
        if (params.subscription) {
            data = data.filter(d => {
                return d.subscription === params.subscription;
            });
        }

        return applyListParams(data, params, (id, paramName) => {
            return retrieveItem(accountId, id, paramName);
        });
    }
}
