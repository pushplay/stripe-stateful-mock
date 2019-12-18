import Stripe from "stripe";

export class StripeError extends Error {

    constructor(public statusCode: number, public error: StripeError.StripeErrorParams) {
        super(error.message);
    }
}

export namespace StripeError {
    /**
     * Stripe's params for a REST error.  These get passed into Stripe.StripeError.populate().
     */
    export interface StripeErrorParams {
        message: string;
        type: Stripe.RawErrorType;
        code?: string;
        param?: string;
        charge?: string;
        decline_code?: string;
        payment_intent?: Stripe.PaymentIntent;
        payment_method?: Stripe.PaymentMethod;
        setup_intent?: Stripe.SetupIntent;
        doc_url?: string;
    }
}
