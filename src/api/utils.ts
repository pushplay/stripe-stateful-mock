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

/**
 * Applies query parameters common to all "list" endpoints (IListOptions) to the results.
 * @param data The result of the list endpoint.
 * @param params The list endpoint params.
 * @param retriever A function that retrieves an item from the list with the given ID.
 *                  When an object with the given ID is not in the list a StripeError
 *                  should be thrown that matches the error when using the `retrieve` endpoint.
 */
export function applyListOptions<T extends { id: string }>(data: T[], params: Stripe.PaginationParams, retriever: (id: string, paramName: string) => T): Stripe.ApiList<T> {
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
 * Hide some properties from the object that are not expanded.
 * @param obj The object to expand.
 * @param hideList The list of properties to hide.
 * @param expandList The list of properties to expand (unhide).
 */
export function expandObject<T extends { id: string }>(obj: T, hideList: (keyof T)[], expandList?: (keyof T)[]): Partial<T> {
    const filteredObj: Partial<T> = {};
    for (const key in obj) {
        if (!hideList.includes(key) || expandList?.includes(key)) {
            filteredObj[key] = obj[key];
        }
    }

    return filteredObj;
}

/**
 * Hide some properties from the objects that are not expanded.
 * @param list The list of objects to expand.
 * @param hideList The list of properties to hide.
 * @param expandList The list of properties to expand (unhide).
 */
export function expandList<T extends { id: string }>(list: Stripe.ApiList<T>, hideList: (keyof T)[], expandList?: (keyof T)[]): Stripe.ApiList<Partial<T>> {
    return {
        ...list,
        data: list.data.map(d => expandObject(d, hideList, expandList))
    };
}
