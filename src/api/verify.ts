import {StripeError} from "./StripeError";
import {AccountData} from "./AccountData";

export namespace verify {
    export const validCurrencies = ["usd", "aed", "afn", "all", "amd", "ang", "aoa", "ars", "aud", "awg", "azn", "bam", "bbd", "bdt", "bgn", "bif", "bmd", "bnd", "bob", "brl", "bsd", "bwp", "bzd", "cad", "cdf", "chf", "clp", "cny", "cop", "crc", "cve", "czk", "djf", "dkk", "dop", "dzd", "egp", "etb", "eur", "fjd", "fkp", "gbp", "gel", "gip", "gmd", "gnf", "gtq", "gyd", "hkd", "hnl", "hrk", "htg", "huf", "idr", "ils", "inr", "isk", "jmd", "jpy", "kes", "kgs", "khr", "kmf", "krw", "kyd", "kzt", "lak", "lbp", "lkr", "lrd", "lsl", "mad", "mdl", "mga", "mkd", "mmk", "mnt", "mop", "mro", "mur", "mvr", "mwk", "mxn", "myr", "mzn", "nad", "ngn", "nio", "nok", "npr", "nzd", "pab", "pen", "pgk", "php", "pkr", "pln", "pyg", "qar", "ron", "rsd", "rub", "rwf", "sar", "sbd", "scr", "sek", "sgd", "shp", "sll", "sos", "srd", "std", "szl", "thb", "tjs", "top", "try", "ttd", "twd", "tzs", "uah", "ugx", "uyu", "uzs", "vnd", "vuv", "wst", "xaf", "xcd", "xof", "xpf", "yer", "zar", "zmw", "eek", "lvl", "svc", "vef", "ltl"];

    export function currency(currency: string, paramName: string): void {
        if (validCurrencies.indexOf(currency) === -1) {
            throw new StripeError(400, {
                message: `Invalid currency: ${currency}. Stripe currently supports these currencies: ${validCurrencies.join(", ")}`,
                param: paramName,
                type: "invalid_request_error"
            });
        }
    }

    export function notExists(accountData: AccountData<any>, accountId: string, objId: string, objectType: string): void {
        if (accountData.contains(accountId, objId)) {
            throw new StripeError(400, {
                code: "resource_already_exists",
                doc_url: "https://stripe.com/docs/error-codes/resource-already-exists",
                message: `${objectType} already exists.`,
                type: "invalid_request_error"
            });
        }
    }

    /**
     * Supports the form "param" and "param[child]".  There is an array form like
     * "paramArray[][child]" but I haven't needed it yet.
     */
    export function requiredParams(obj: any, paramNames: string[]): void {
        for (const paramName of paramNames) {
            const paramNameParts = /^([a-zA-Z_]+)(?:\[([a-zA-Z_]+)\])?$/.exec(paramName);
            if (!paramNameParts || !paramNameParts[1]) {
                throw new Error("Unexpected paramName.  Must be \"foo\" or \"foo[bar]\".");
            }

            if (!obj.hasOwnProperty(paramNameParts[1]) || (paramNameParts[2] && !obj[paramNameParts[1]].hasOwnProperty(paramNameParts[2]))) {
                throw new StripeError(400, {
                    code: "parameter_missing",
                    doc_url: "https://stripe.com/docs/error-codes/parameter-missing",
                    message: `Missing required param: ${paramName}.`,
                    param: paramName,
                    type: "invalid_request_error"
                });
            }
        }
    }
}
