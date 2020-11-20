import Stripe, {PaymentIntentCreateParams} from "stripe";
import {AccountData} from "./AccountData";
import {applyListOptions, generateId, stringifyMetadata} from "./utils";
import log = require("loglevel");
import {customers} from "./customers";

export namespace paymentIntents {

    const accountPaymentIntents = new AccountData<Stripe.PaymentIntent>();

    export function create(accountId: string, params: Stripe.PaymentIntentCreateParams): Stripe.PaymentIntent {
        log.debug("paymentIntents.create", accountId, params);

        const paymentIntentId = `pi_${generateId(24)}`;
        const paymentIntent: Stripe.PaymentIntent = {
            id: paymentIntentId,
            object: "payment_intent",
            amount: +params.amount,
            amount_capturable: 0,
            amount_received: 0,
            application: null,
            canceled_at: null,
            cancellation_reason: null,
            capture_method: params.capture_method || "automatic",
            charges: {
                object: "list",
                data: [],
                has_more: false,
                url: `/v1/charges?payment_intent=${paymentIntentId}`
            },
            client_secret: `${paymentIntentId}_secret_${generateId(25)}`,
            confirmation_method: params.confirmation_method || "automatic",
            created: (Date.now() / 1000) | 0,
            currency: params.currency,
            customer: params.customer ? customers.retrieve(accountId, params.customer, "customer") : null,
            description: params.description,
            invoice: null,
            last_payment_error: null,
            livemode: false,
            metadata: stringifyMetadata(params.metadata),
            next_action: null,
            on_behalf_of: params.on_behalf_of,
            payment_method: null,
            payment_method_options: params.payment_method_options || {},
            payment_method_types: ["card"],
            receipt_email: params.receipt_email || null,
            review: null,
            setup_future_usage: params.setup_future_usage || null,
            shipping: params.shipping || null,
            statement_descriptor: params.statement_descriptor || null,
            statement_descriptor_suffix: params.statement_descriptor_suffix || null,
            status: "requires_payment_method",
            transfer_data: params.transfer_data || null,
            transfer_group: params.transfer_group || null
        };
        accountPaymentIntents.put(accountId, paymentIntent);
        return paymentIntent;
    }

    function getPaymentMethodOptionsFromParams(params: Stripe.PaymentIntentCreateParams.PaymentMethodOptions | ""): Stripe.PaymentIntentCreateParams.PaymentMethodOptions | null {
        if (!params || params === "") {
            return null;
        }

        // Ugh this gets complicated and I dunno if I care enough.
    }

    export function retrieve(accountId: string, paymentIntentId: string, paramName: string): Stripe.PaymentIntent {
        log.debug("paymentIntents.retrieve", accountId, paymentIntentId);

    }

    export function update(accountId: string, paymentIntentId: string, params: Stripe.PaymentIntentUpdateParams): Stripe.PaymentIntent {
        log.debug("paymentIntents.update", accountId, paymentIntentId, params);

    }

    export function confirm(accountId: string, paymentIntentId: string, params: Stripe.PaymentIntentConfirmParams): Stripe.PaymentIntent {
        log.debug("paymentIntents.confirm", accountId, paymentIntentId, params);

    }

    export function capture(accountId: string, paymentIntentId: string, params: Stripe.PaymentIntentCaptureParams): Stripe.PaymentIntent {
        log.debug("paymentIntents.capture", accountId, paymentIntentId, params);

    }

    export function cancel(accountId: string, paymentIntentId: string, params: Stripe.PaymentIntentCancelParams): Stripe.PaymentIntent {
        log.debug("paymentIntents.cancel", accountId, params);

    }

    export function list(accountId: string, params: Stripe.PaymentIntentListParams): Stripe.ApiList<Stripe.PaymentIntent> {
        log.debug("paymentIntents.list", accountId, params);

        let data = accountPaymentIntents.getAll(accountId);
        if (params.customer) {
            data = data.filter(d => d.customer === params.customer);
        }
        return applyListOptions(data, params, (id, paramName) => retrieve(accountId, id, paramName));
    }
}
