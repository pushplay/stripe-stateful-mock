import * as stripe from "stripe";

export default class StripeError extends Error {

    constructor(public statusCode: number, public error: stripe.IStripeError & {doc_url?: string}) {
        super(error.message);
    }
}
