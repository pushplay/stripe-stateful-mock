import * as stripe from "stripe";
import log = require("loglevel");
import {AccountData} from "./AccountData";
import StripeError from "./StripeError";

namespace paymentIntents {

    const accountPaymentIntents = new AccountData<stripe.paymentIntents.IPaymentIntent>();

    export function create(accountId: string, params: stripe.paymentIntents.IPaymentIntentCreationOptions): stripe.paymentIntents.IPaymentIntent {
        throw new Error("not implemented");
    }

    export function update(accountId: string, paymentIntentId: string, params: stripe.paymentIntents.IPaymentIntentUpdateOptions): stripe.paymentIntents.IPaymentIntent {
        throw new Error("not implemented");
    }

    export function confirm(accountId: string, paymentIntentId: string, params: stripe.paymentIntents.IPaymentIntentConfirmOptions): stripe.paymentIntents.IPaymentIntent {
        throw new Error("not implemented");
    }

    export function capture(accountId: string, paymentIntentId: string, params: stripe.paymentIntents.IPaymentIntentCaptureOptions): stripe.paymentIntents.IPaymentIntent {
        throw new Error("not implemented");
    }

    export function cancel(accountId: string, paymentIntentId: string, params: {cancellation_reason?: stripe.paymentIntents.PaymentIntentCancellationReason}): stripe.paymentIntents.IPaymentIntent {
        throw new Error("not implemented");
    }

    export function retrieve(accountId: string, paymentIntentId: string, paramName: string): stripe.paymentIntents.IPaymentIntent {
        log.debug("paymentIntents.retrieve", accountId, paymentIntentId);

        const paymentIntent = accountPaymentIntents.get(accountId, paymentIntentId);
        if (!paymentIntent) {
            throw new StripeError(404, {
                code: "resource_missing",
                doc_url: "https://stripe.com/docs/error-codes/resource-missing",
                message: `No such payment_intent: ${paymentIntentId}`,
                param: paramName,
                type: "invalid_request_error"
            });
        }
        return paymentIntent;
    }

    export function list(accountId: string, params: stripe.paymentIntents.IPaymentIntentListOptions): stripe.IList<stripe.paymentIntents.IPaymentIntent> {
        log.debug("paymentIntents.list", params);

        const paymentIntents = accountPaymentIntents.getAll(accountId);
        return {
            object: "list",
            data: paymentIntents,
            has_more: false,
            url: "/v1/payment_intents"
        };
    }

}

export default paymentIntents;
