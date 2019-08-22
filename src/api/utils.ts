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
