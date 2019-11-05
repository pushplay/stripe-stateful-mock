import * as stripe from "stripe";
import {StripeError} from "./StripeError";

export function generateId(length: number = 20): string {
    const chars = "0123456789abcfedghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    return new Array(length).fill("5").map(() => chars[(Math.random() * chars.length) | 0]).join("");
}

export function stringifyMetadata(metadata?: {[key: string]: string | number}): {[key: string]: string} {
    if (!metadata) {
        return {};
    }

    const resp: {[key: string]: string} = {};
    for (const key in metadata) {
        resp[key] = metadata[key] + "";
    }
    return resp;
}

/**
 * Applies query parameters common to all "list" endpoints (IListOptions) to the results.
 * @param data The result of the list endpoint.
 * @param params The list endpoint params.
 * @param retriever A function that retrieves an item from the list with the given ID.
 *                  When an object with the given ID is not in the list a StripeError
 *                  should be thrown that matches the error when using the `retrieve` endpoint.
 */
export function applyListOptions<T extends {id: string}>(data: T[], params: stripe.IListOptions, retriever: (id: string, paramName: string) => T): stripe.IList<T> {
    let hasMore = false;
    if (params.starting_after) {
        const startingAfter = retriever(params.starting_after, "starting_after");
        const startingAfterIx = data.indexOf(startingAfter);
        data = data.slice(startingAfterIx + 1);
        if (params.limit && data.length > params.limit) {
            data = data.slice(0, params.limit);
            hasMore = true;
        }
    } else if (params.ending_before) {
        const endingBefore = retriever(params.ending_before, "ending_before");
        const endingBeforeIx = data.indexOf(endingBefore);
        data = data.slice(0, endingBeforeIx);
        if (params.limit && data.length > params.limit) {
            data = data.slice(data.length - params.limit);
            hasMore = true;
        }
    } else if (params.limit && data.length > params.limit) {
        data = data.slice(0, params.limit);
        hasMore = true;
    }
    return {
        object: "list",
        data: data,
        has_more: hasMore,
        url: "/v1/refunds"
    };
}

/**
 * Supports the form "param" and "param[child]".  There is an array form like
 * "paramArray[][child]" but I haven't needed it yet.
 */
export function requireParams(obj: any, paramNames: string[]): void {
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
