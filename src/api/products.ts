import * as stripe from "stripe";
import log = require("loglevel");
import {AccountData} from "./AccountData";
import {applyListOptions, generateId, stringifyMetadata} from "./utils";
import {verify} from "./verify";
import {StripeError} from "./StripeError";

export namespace products {

    const accountProducts = new AccountData<stripe.products.IProduct>();

    export function create(accountId: string, params: stripe.products.IProductCreationOptions): stripe.products.IProduct {
        log.debug("products.create", accountId, params);

        verify.requiredParams(params, ["name", "type"]);
        verify.requiredValue(params, "type", ["service", "good"]);

        const productId = params.id || `prod_${generateId()}`;
        if (accountProducts.contains(accountId, productId)) {
            throw new StripeError(400, {
                code: "resource_already_exists",
                doc_url: "https://stripe.com/docs/error-codes/resource-already-exists",
                message: `Product already exists.`,
                type: "invalid_request_error"
            });
        }

        const product: stripe.products.IProduct = {
            id: productId,
            object: "product",
            active: params.hasOwnProperty("active") ? params.active : true,
            attributes: params.attributes || [],
            created: (Date.now() / 1000) | 0,
            caption: params.caption || null,
            deactivated_on: params.deactivate_on || undefined,
            description: params.description || null,
            images: params.images || [],
            livemode: false,
            metadata: stringifyMetadata(params.metadata),
            name: params.name,
            package_dimensions: params.package_dimensions || null,
            shippable: params.type === "good" ? params.shippable || true : null,
            statement_descriptor: undefined,
            skus: undefined,
            type: params.type,
            updated: (Date.now() / 1000) | 0,
            url: params.url || null
        };

        accountProducts.put(accountId, product);
        return product;
    }

    export function retrieve(accountId: string, productId: string, paramName: string): stripe.products.IProduct {
        log.debug("products.retrieve", accountId, productId);

        const product = accountProducts.get(accountId, productId);
        if (!product) {
            throw new StripeError(404, {
                code: "resource_missing",
                doc_url: "https://stripe.com/docs/error-codes/resource-missing",
                message: `No such product: ${productId}`,
                param: paramName,
                type: "invalid_request_error"
            });
        }
        return product;
    }

    export function list(accountId: string, params: stripe.products.IProductListOptions): stripe.IList<stripe.products.IProduct> {
        log.debug("products.list", accountId, params);

        let data = accountProducts.getAll(accountId);
        if (params.hasOwnProperty("active")) {
            data = data.filter(d => d.active === params.active);
        }
        if (params.ids) {
            data = data.filter(d => params.ids.indexOf(d.id) !== -1);
        }
        if (params.hasOwnProperty("shippable")) {
            data = data.filter(d => d.shippable === params.shippable);
        }
        if (params.url) {
            data = data.filter(d => d.url === params.url);
        }
        if (params.type) {
            data = data.filter(d => d.type === params.type);
        }
        return applyListOptions(data, params, (id, paramName) => retrieve(accountId, id, paramName));
    }
}
