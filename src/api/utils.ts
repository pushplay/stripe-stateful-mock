import * as stripe from "stripe";

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
