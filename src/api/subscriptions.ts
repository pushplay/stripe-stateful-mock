import Stripe from "stripe";
import {AccountData} from "./AccountData";
import {RestError} from "./RestError";
import {applyListOptions, generateId, stringifyMetadata} from "./utils";
import {customers} from "./customers";
import {plans} from "./plans";
import {prices} from "./prices";
import {verify} from "./verify";
import {taxRates} from "./taxRates";
import {accounts} from "./accounts";
import log = require("loglevel");

export namespace subscriptions {

    const accountSubscriptions = new AccountData<Stripe.Subscription>();
    const accountSubscriptionItems = new AccountData<Stripe.SubscriptionItem>();

    export function create(accountId: string, params: Stripe.SubscriptionCreateParams): Stripe.Subscription {
        log.debug("subscriptions.create", accountId, params);

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

        const subscriptionId = (params as any).id || `sub_${generateId(14)}`;
        if (accountSubscriptions.contains(accountId, subscriptionId)) {
            throw new RestError(400, {
                code: "resource_already_exists",
                doc_url: "https://stripe.com/docs/error-codes/resource-already-exists",
                message: "Subscription already exists.",
                type: "invalid_request_error"
            });
        }

        const now = Math.floor((Date.now() / 1000));
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1);

        const subscription: Stripe.Subscription = {
            id: subscriptionId,
            object: "subscription",
            application_fee_percent: +params.application_fee_percent || null,
            collection_method: params.collection_method || "charge_automatically",
            billing_cycle_anchor: +params.billing_cycle_anchor || now,
            billing_thresholds: null,
            cancel_at: null,
            cancel_at_period_end: false,
            canceled_at: null,
            created: now,
            current_period_end: Math.floor(nextMonth.getTime() / 1000), // Hard coded to assume month long subscriptions
            current_period_start: now,
            customer: params.customer,
            days_until_due: +params.days_until_due || null,
            default_payment_method: null,
            default_source: default_source || null,
            default_tax_rates: params.default_tax_rates?.map(t => taxRates.retrieve(accountId, t, "default_tax_rate")),
            discount: null,
            ended_at: null,
            items: {
                object: "list",
                data: [],
                has_more: false,
                url: `/v1/subscription_items?subscription=${subscriptionId}`
            },
            latest_invoice: `in_${generateId(14)}`,
            livemode: false,
            metadata: stringifyMetadata(params.metadata),
            next_pending_invoice_item_invoice: null,
            pause_collection: null,
            pending_invoice_item_interval: null,
            pending_setup_intent: null,
            pending_update: null,
            schedule: null,
            start_date: Math.floor(Date.now() / 1000),
            status: "active",
            transfer_data: params.transfer_data ? {
                amount_percent: params.transfer_data.amount_percent ?? null,
                destination: accounts.retrieve(accountId, params.transfer_data.destination, "")
            } : null,
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

    function getOrCreatePlan(accountId: string, planId: string): Stripe.Plan {
        try {
            return plans.retrieve(accountId, planId, "plan");
        } catch (error) {
            if ((error as RestError).error?.code === "resource_missing") {
                return plans.create(accountId, {
                    id: planId,
                    currency: "usd",
                    interval: "month"
                })
            }
            throw error;
        }
    }

    function createItem(accountId: string, item: Stripe.SubscriptionCreateParams.Item, subscriptionId: string): Stripe.SubscriptionItem {
        const paramId = (item as any).id;
        const subItemId = paramId || `si_${generateId(14)}`;

        const subscriptionItem: Stripe.SubscriptionItem = {
            object: "subscription_item",
            id: subItemId,
            billing_thresholds: item.billing_thresholds,
            created: Math.floor(Date.now() / 1000),
            deleted: undefined,
            metadata: stringifyMetadata(item.metadata),
            plan: getOrCreatePlan(accountId, item.plan),    // isn't in the documentation, deprecated?
            price: item.price ? prices.retrieve(accountId, item.price, "price") : null,
            quantity: +item.quantity || 1,
            subscription: subscriptionId,
            tax_rates: item.tax_rates?.map(r => taxRates.retrieve(accountId, r, "tax_rate"))
        };
        accountSubscriptionItems.put(accountId, subscriptionItem);

        return subscriptionItem;
    }

    export function updateItem(accountId: string, subscriptionItemId: string, params: Stripe.SubscriptionItemUpdateParams): Stripe.SubscriptionItem {
        log.debug("subscriptions.updateItem", accountId, subscriptionItemId, params);

        const subscriptionItem = retrieveItem(accountId, subscriptionItemId, "id");

        if (params.quantity) {
            subscriptionItem.quantity = +params.quantity;
        }

        return subscriptionItem;
    }

    export function retrieve(accountId: string, subscriptionId: string, paramName: string): Stripe.Subscription {
        log.debug("subscriptions.retrieve", subscriptionId);

        const subscription = accountSubscriptions.get(
            accountId, subscriptionId
        );
        if (!subscription) {
            throw new RestError(404, {
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
        log.debug("subscriptions.retrieveItem", subscriptionItemId);

        const subscriptionItem = accountSubscriptionItems.get(
            accountId, subscriptionItemId
        );
        if (!subscriptionItem) {
            throw new RestError(404, {
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
        log.debug("subscriptions.list", params);

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

        return applyListOptions(data, params, (id, paramName) => {
            return retrieve(accountId, id, paramName);
        });
    }

    export function listItems(accountId: string, params: Partial<Stripe.SubscriptionItemListParams>): Stripe.ApiList<Stripe.SubscriptionItem> {
        log.debug("subscriptionItems.list", params);

        verify.requiredParams(params, ["subscription"]);
        const data = accountSubscriptionItems
            .getAll(accountId)
            .filter(d => {
                return d.subscription === params.subscription;
            });

        return applyListOptions(data, params, (id, paramName) => {
            return retrieveItem(accountId, id, paramName);
        });
    }
}
