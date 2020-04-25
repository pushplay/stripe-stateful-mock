import Stripe from "stripe";

export class RestError extends Error {

    constructor(public statusCode: number, public error: RestError.StripeErrorJson) {
        super(error.message);
    }
}

export namespace RestError {
    export interface StripeErrorJson {
        message: string;
        type: "card_error" | "invalid_request_error" | "api_error" | "authentication_error" | "rate_limit_error" | "idempotency_error" | "invalid_grant";
        readonly code?: string;
        doc_url?: string;
        param?: string;
        charge?: string;
        decline_code?: string;
        payment_intent?: Stripe.PaymentIntent;
        payment_method?: Stripe.PaymentMethod;
        setup_intent?: Stripe.SetupIntent;
        source?: Stripe.Source;
    }
}
