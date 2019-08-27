import * as stripe from "stripe";
import log = require("loglevel");
import StripeError from "./StripeError";
import {generateId, stringifyMetadata} from "./utils";
import cards from "./cards";

namespace customers {

    const existingCustomers: {[customerId: string]: stripe.customers.ICustomer} = {};

    export function create(params: stripe.customers.ICustomerCreationOptions): stripe.customers.ICustomer {
        log.debug("create customer", params);

        if ((params as any).id && existingCustomers[(params as any).id]) {
            throw new StripeError(400, {
                code: "resource_already_exists",
                doc_url: "https://stripe.com/docs/error-codes/resource-already-exists",
                message: "Customer already exists.",
                type: "invalid_request_error"
            })
        }
        
        const customerId = (params as any).id || `cus_${generateId(14)}`;
        const now = new Date();
        const customer: stripe.customers.ICustomer = existingCustomers[customerId] = {
            id: customerId,
            object: "customer",
            account_balance: params.account_balance || 0,
            address: params.address || null,
            // balance: params.balance || 0,
            created: (now.getTime() / 1000) | 0,
            currency: "usd",
            default_source: null,
            delinquent: false,
            description: params.description || null,
            discount: null,
            email: params.email || null,
            // invoice_prefix: "8BAA47A",
            invoice_settings: {
                custom_fields: null,
                default_payment_method: null,
                footer: null
            },
            livemode: false,
            metadata: stringifyMetadata(params.metadata),
            name: null,
            phone: null,
            // preferred_locales: [],
            shipping: params.shipping || null,
            sources: {
                object: "list",
                data: [],
                has_more: false,
                total_count: 0,
                url: `/v1/customers/${customerId}/sources`
            },
            subscriptions: {
                object: "list",
                data: [],
                has_more: false,
                total_count: 0,
                url: `/v1/customers/${customerId}/subscriptions`
            } as any,
            // tax_exempt: "none",
            // tax_ids: {
            //     object: "list",
            //     data: [],
            //     has_more: false,
            //     total_count: 0,
            //     url: "/v1/customers/cus_FhFu67G2pEu5wW/tax_ids"
            // },
            // tax_info: null,
            // tax_info_verification: null
        };

        if (typeof params.source === "string") {
            const card = cards.createFromSource(params.source);
            card.customer = customerId;
            customer.default_source = card.id;
            customer.sources.data.push(card);
            customer.sources.total_count++;

            // Special token handling.
            switch (params.source) {
                case "tok_chargeDeclined":
                    throw new StripeError(402, {
                        code: "card_declined",
                        decline_code: "generic_decline",
                        doc_url: "https://stripe.com/docs/error-codes/card-declined",
                        message: "Your card was declined.",
                        param: "",
                        type: "card_error"
                    });
                case "tok_chargeDeclinedInsufficientFunds":
                    throw new StripeError(402, {
                        code: "card_declined",
                        decline_code: "insufficient_funds",
                        doc_url: "https://stripe.com/docs/error-codes/card-declined",
                        message: "Your card has insufficient funds.",
                        param: "",
                        type: "card_error"
                    });
                case "tok_chargeDeclinedIncorrectCvc":
                    throw new StripeError(402, {
                        code: "incorrect_cvc",
                        doc_url: "https://stripe.com/docs/error-codes/incorrect-cvc",
                        message: "Your card's security code is incorrect.",
                        param: "cvc",
                        type: "card_error"
                    });
                case "tok_chargeDeclinedExpiredCard":
                    throw new StripeError(402, {
                        code: "expired_card",
                        doc_url: "https://stripe.com/docs/error-codes/expired-card",
                        message: "Your card has expired.",
                        param: "exp_month",
                        type: "card_error"
                    });
            }
        } else if (params.source) {
            throw new Error("Card create options on create customer aren't supported.")
        }
        
        return customer;
    }

    export function retrieve(customerId: string, param: string): stripe.customers.ICustomer {
        const customer = existingCustomers[customerId];
        if (!customer) {
            throw new StripeError(404, {
                code: "resource_missing",
                doc_url: "https://stripe.com/docs/error-codes/resource-missing",
                message: `No such customer: ${customerId}`,
                param: param,
                type: "invalid_request_error"
            });
        }
        return customer;
    }

    export function retrieveCard(customerId: string, cardId: string): stripe.cards.ICard {
        const customer = retrieve(customerId, "customer");
        const card = customer.sources.data.find(card => card.id === cardId && card.object === "card") as stripe.cards.ICard;
        if (!card) {
            throw new StripeError(404, {
                code: "resource_missing",
                doc_url: "https://stripe.com/docs/error-codes/resource-missing",
                message: `Customer ${customerId} does not have card with ID ${cardId}`,
                param: "card",
                type: "invalid_request_error"
            });
        }
        return card;
    }
}

export default customers;
