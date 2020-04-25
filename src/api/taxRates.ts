import Stripe from "stripe";
import {AccountData} from "./AccountData";
import {applyListOptions, generateId, stringifyMetadata} from "./utils";
import {RestError} from "./RestError";
import log = require("loglevel");

export namespace taxRates {

    const accountTaxRates = new AccountData<Stripe.TaxRate>();

    export function create(accountId: string, params: Stripe.TaxRateCreateParams): Stripe.TaxRate {
        log.debug("taxRates.create", accountId, params);

        const taxRateId = `id_${generateId(24)}`;
        const taxRate: Stripe.TaxRate = {
            id: taxRateId,
            object: "tax_rate",
            active: params.active as any !== "false",
            created: (Date.now() / 1000) | 0,
            description: params.description || null,
            display_name: params.display_name,
            inclusive: params.inclusive as any !== "false",
            jurisdiction: params.jurisdiction || null,
            livemode: false,
            metadata: stringifyMetadata(params.metadata),
            percentage: +params.percentage
        };
        accountTaxRates.put(accountId, taxRate);
        return taxRate;
    }

    export function retrieve(accountId: string, taxRateId: string, paramName: string): Stripe.TaxRate {
        log.debug("taxRates.retrieve", accountId, taxRateId);

        const taxRate = accountTaxRates.get(accountId, taxRateId);
        if (!taxRate) {
            throw new RestError(404, {
                code: "resource_missing",
                doc_url: "https://stripe.com/docs/error-codes/resource-missing",
                message: `No such tax rate: ${taxRateId}`,
                param: paramName,
                type: "invalid_request_error"
            });
        }
        return taxRate;
    }

    export function list(accountId: string, params: Stripe.TaxRateListParams): Stripe.ApiList<Stripe.TaxRate> {
        log.debug("taxRates.list", accountId, params);

        let data = accountTaxRates.getAll(accountId);
        if (params.active !== undefined) {
            data = data.filter(t => t.active === params.active);
        }
        if (params.inclusive !== undefined) {
            data = data.filter(t => t.inclusive === params.inclusive);
        }
        return applyListOptions(data, params, (id, paramName) => retrieve(accountId, id, paramName));
    }

    export function update(accountId: string, taxRateId: string, params: Stripe.TaxRateUpdateParams): Stripe.TaxRate {
        log.debug("taxRates.update", accountId, taxRateId, params);

        const taxRate = retrieve(accountId, taxRateId, "id");
        if (params.active !== undefined) {
            taxRate.active = params.active as any !== "false";
        }
        if (params.description !== undefined) {
            taxRate.description = params.description;
        }
        if (params.display_name !== undefined) {
            taxRate.display_name = params.display_name;
        }
        if (params.jurisdiction !== undefined) {
            taxRate.jurisdiction = params.jurisdiction;
        }
        if (params.metadata !== undefined) {
            taxRate.metadata = stringifyMetadata(params.metadata);
        }
        return taxRate;
    }

}
