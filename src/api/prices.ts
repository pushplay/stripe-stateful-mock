import Stripe from "stripe";
import {AccountData} from "./AccountData";
import {applyListOptions, generateId, stringifyMetadata} from "./utils";
import {RestError} from "./RestError";
import {verify} from "./verify";
import {products} from "./products";
import log = require("loglevel");

export namespace prices {

    const accountPrices = new AccountData<Stripe.Price>();

    export function create(accountId: string, params: Stripe.PriceCreateParams): Stripe.Price {
        log.debug("prices.create", accountId, params);

        verify.requiredParams(params, ["currency"]);
        verify.currency(params.currency, "currency");
        if (!!params.product === !!params.product_data) {
            throw new RestError(400, {
                message: "You must specify either `product` or `product_data` when creating a price.",
                type: "invalid_request_error"
            });
        }

        const priceId = `price_${generateId(24)}`;
        const billingScheme = params.billing_scheme ?? "per_unit";
        const price: Stripe.Price = {
            id: priceId,
            object: "price",
            active: params.active ?? true,
            billing_scheme: billingScheme,
            created: (Date.now() / 1000) | 0,
            currency: params.currency,
            livemode: false,
            lookup_key: params.lookup_key ?? null,
            metadata: stringifyMetadata(params.metadata),
            nickname: params.nickname ?? null,
            product: params.product ? params.product : products.create(accountId, params.product_data).id,
            recurring: params.recurring ? {
                aggregate_usage: params.recurring.aggregate_usage ?? null,
                interval: params.recurring.interval,
                interval_count: params.recurring.interval_count ?? 1,
                trial_period_days: params.recurring.trial_period_days ?? null,
                usage_type: params.recurring.usage_type ?? "licensed"
            } : null,
            tiers_mode: params.tiers_mode ?? null,
            transform_quantity: params.transform_quantity ?? null,
            type: params.recurring ? "recurring" : "one_time",
            unit_amount: +(params.unit_amount ?? params.unit_amount_decimal),
            unit_amount_decimal: params.unit_amount_decimal ?? params.unit_amount + ""
        };
        accountPrices.put(accountId, price);
        return price;
    }

    export function retrieve(accountId: string, priceId: string, paramName: string): Stripe.Price {
        log.debug("prices.retrieve", accountId, priceId);

        const price = accountPrices.get(accountId, priceId);
        if (!price) {
            throw new RestError(404, {
                code: "resource_missing",
                doc_url: "https://stripe.com/docs/error-codes/resource-missing",
                message: `No such price: ${priceId}`,
                param: paramName,
                type: "invalid_request_error"
            });
        }
        return price;
    }

    export function update(accountId: string, priceId: string, params: Stripe.PriceUpdateParams): Stripe.Price {
        log.debug("prices.updateItem", accountId, priceId, params);

        const price = retrieve(accountId, priceId, "id");

        if (params.active != undefined) {
            price.active = params.active as any === "true";
        }
        if (params.metadata !== undefined) {
            price.metadata = stringifyMetadata(params.metadata);
        }
        if (params.nickname !== undefined) {
            price.nickname = params.nickname;
        }

        return price;
    }

    export function list(accountId: string, params: Stripe.PriceListParams): Stripe.ApiList<Stripe.Price> {
        log.debug("prices.list", accountId, params);

        let data = accountPrices.getAll(accountId);
        if (params.active != undefined) {
            data = data.filter(price => price.active === (params.active as any === "true"))
        }
        if (params.currency != undefined) {
            data = data.filter(price => price.currency === params.currency);
        }
        if (params.product != undefined) {
            data = data.filter(price => price.product === params.product);
        }
        if (params.type != undefined) {
            data = data.filter(price => price.type === params.type);
        }

        return applyListOptions(data, params, (id, paramName) => retrieve(accountId, id, paramName));
    }
}
