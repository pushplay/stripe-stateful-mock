import * as stripe from "stripe";

export class StripeError extends Error {

    constructor(public statusCode: number, public error: stripe.IStripeError & StripeError.AdditionalStripeErrorMembers) {
        super(error.message);
    }
}

export namespace StripeError {
    export interface AdditionalStripeErrorMembers {
        charge?: string;
        decline_code?: string;
        doc_url?: string;
    }
}
