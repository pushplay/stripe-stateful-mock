import Stripe from "stripe";

export function generateId(length: number = 20): string {
    const chars = "0123456789abcfedghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    return new Array(length).fill("5").map(() => chars[(Math.random() * chars.length) | 0]).join("");
}

export function stringifyMetadata(metadata?: { [key: string]: string | number }): { [key: string]: string } {
    if (!metadata) {
        return {};
    }

    const resp: { [key: string]: string } = {};
    for (const key in metadata) {
        resp[key] = metadata[key] + "";
    }
    return resp;
}

export function optionalsToNulls<T extends object, U extends { [key: string]: null }>(params: T, nulls: U): T & U {
    const res: T & U = {...params} as any;
    for (const nullsKey in params) {
        if (nulls.hasOwnProperty(nullsKey) && !res.hasOwnProperty(nullsKey)) {
            res[nullsKey] = null;
        }
    }
    return res;
}

export function arrayOptionalsToNulls<T extends object, U extends { [key: string]: null }>(params: T[], nulls: U): (T & U)[] {
    return params.map(e => optionalsToNulls(e, nulls));
}

/**
 * Applies query parameters common to all "list" endpoints (IListParams) to the results.
 * @param data The result of the list endpoint.
 * @param params The list endpoint params.
 * @param retriever A function that retrieves an item from the list with the given ID.
 *                  When an object with the given ID is not in the list a StripeError
 *                  should be thrown that matches the error when using the `retrieve` endpoint.
 */
export function applyListParams<T extends { id: string }>(data: T[], params: Stripe.ApiListParams, retriever: (id: string, paramName: string) => T): Stripe.ApiList<T> {
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
