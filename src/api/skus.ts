import Stripe from "stripe";
import {AccountData} from "./AccountData";
import {applyListOptions, generateId, stringifyMetadata} from "./utils";
import {verify} from "./verify";
import {RestError} from "./RestError";
import log = require("loglevel");

export namespace skus {

    const accountSkus = new AccountData<Stripe.Sku>();

    export function create(accountId: string, params: Stripe.SkuCreateParams): Stripe.Sku {
        log.debug("products.create", accountId, params);

        verify.requiredParams(params, ["currency"]);
        verify.requiredParams(params, ["inventory"]);
        verify.requiredParams(params, ["price"]);
        verify.requiredParams(params, ["product"]);

        const skuId = params.id || `sku_${generateId()}`;
        if (accountSkus.contains(accountId, skuId)) {
            throw new RestError(400, {
                code: "resource_already_exists",
                doc_url: "https://stripe.com/docs/error-codes/resource-already-exists",
                message: `Sku already exists.`,
                type: "invalid_request_error"
            });
        }

        const sku: Stripe.Sku = {
            id: skuId,
            object: "sku",
            active: params.active ?? true,
            attributes: params.attributes || {},
            created: (Date.now() / 1000) | 0,
            currency: params.currency,
            image: params.image ?? null,
            inventory: {
              ...params.inventory,
              quantity: params.inventory.quantity ?? null,
              value: params.inventory.value ?? null
            },
            livemode: false,
            metadata: stringifyMetadata(params.metadata),
            package_dimensions: params.package_dimensions ?? null,
            price: params.price,
            product: params.product,
            updated: (Date.now() / 1000) | 0,
        };

        accountSkus.put(accountId, sku);
        return sku;
    }

    export function retrieve(accountId: string, skuId: string, paramName: string): Stripe.Sku {
        log.debug("sku.retrieve", accountId, skuId);

        const sku = accountSkus.get(accountId, skuId);
        if (!sku) {
            throw new RestError(404, {
                code: "resource_missing",
                doc_url: "https://stripe.com/docs/error-codes/resource-missing",
                message: `No such sku: ${skuId}`,
                param: paramName,
                type: "invalid_request_error"
            });
        }
        return sku;
    }

    export function list(accountId: string, params: Stripe.SkuListParams): Stripe.ApiList<Stripe.Sku> {
        log.debug("products.list", accountId, params);

        let data = accountSkus.getAll(accountId);
        if (params.active !== undefined) {
            data = data.filter(d => d.active === params.active);
        }
        if (params.ids) {
            data = data.filter(d => params.ids.indexOf(d.id) !== -1);
        }
        if (params.product !== undefined) {
            data = data.filter(d => d.product === params.product);
        }
        
        return applyListOptions(data, params, (id, paramName) => retrieve(accountId, id, paramName));
    }
}
