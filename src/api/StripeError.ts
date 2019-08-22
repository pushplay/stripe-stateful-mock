import * as stripe from "stripe";

export interface AdditionalStripeErrorMembers {
    charge?: string;
    decline_code?: string;
    doc_url?: string;
}

export default class StripeError extends Error {

    constructor(public statusCode: number, public error: stripe.IStripeError & AdditionalStripeErrorMembers) {
        super(error.message);
    }
}
