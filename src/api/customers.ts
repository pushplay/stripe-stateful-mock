import Stripe from "stripe";
import {RestError} from "./RestError";
import {applyListOptions, expandObject, generateId, stringifyMetadata} from "./utils";
import {cards} from "./cards";
import {AccountData} from "./AccountData";
import {verify} from "./verify";
import {charges} from "./charges";
import log = require("loglevel");

export namespace customers {

    const accountCustomers = new AccountData<Stripe.Customer>();

    export function create(accountId: string, params: Stripe.CustomerCreateParams): Stripe.Customer {
        log.debug("customers.create", accountId, params);

        if ((params as any).id && accountCustomers.contains(accountId, (params as any).id)) {
            throw new RestError(400, {
                code: "resource_already_exists",
                doc_url: "https://stripe.com/docs/error-codes/resource-already-exists",
                message: "Customer already exists.",
                type: "invalid_request_error"
            });
        }

        const customerId = (params as any).id || `cus_${generateId(14)}`;
        const customer: Stripe.Customer = {
            id: customerId,
            object: "customer",
            address: charges.getAddressFromParams(params.address),
            balance: +params.balance || 0,
            created: (Date.now() / 1000) | 0,
            currency: null,
            default_source: null,
            delinquent: false,
            description: params.description || null,
            discount: null,
            email: params.email || null,
            invoice_prefix: params.invoice_prefix || generateId(7),
            invoice_settings: {
                custom_fields: null,
                default_payment_method: null,
                footer: null
            },
            livemode: false,
            metadata: stringifyMetadata(params.metadata),
            name: null,
            next_invoice_sequence: 1,
            phone: null,
            preferred_locales: params.preferred_locales || [],
            shipping: charges.getShippingFromParams(params.shipping),
            sources: {
                object: "list",
                data: [],
                has_more: false,
                url: `/v1/customers/${customerId}/sources`
            },
            subscriptions: {
                object: "list",
                data: [],
                has_more: false,
                url: `/v1/customers/${customerId}/subscriptions`
            } as any,
            tax_exempt: params.tax_exempt || "none",
            tax_ids: {
                object: "list",
                data: [],
                has_more: false,
                url: "/v1/customers/cus_FhFu67G2pEu5wW/tax_ids"
            }
        };

        if (params.source) {
            createCard(accountId, customer, {source: params.source});
        }

        if (params.source !== "tok_forget") {
            accountCustomers.put(accountId, customer);
        }

        return expandObject(
            customer,
            ["sources", "subscriptions"],
            params.expand
        );
    }

    export function retrieve(accountId: string, customerId: string, paramName: string, params?: Stripe.CustomerRetrieveParams): Stripe.Customer {
        log.debug("customers.retrieve", accountId, customerId);

        const customer = accountCustomers.get(accountId, customerId);
        if (!customer) {
            throw new RestError(404, {
                code: "resource_missing",
                doc_url: "https://stripe.com/docs/error-codes/resource-missing",
                message: `No such customer: ${customerId}`,
                param: paramName,
                type: "invalid_request_error"
            });
        }

        return expandObject(
            customer,
            ["sources", "subscriptions"],
            params?.expand
        );
    }

    export function list(accountId: string, params: Stripe.CustomerListParams): Stripe.ApiList<Stripe.Customer> {
        log.debug("customers.list", accountId, params);

        let data = accountCustomers.getAll(accountId);
        if (params.email) {
            data = data.filter(d => d.email === params.email);
        }
        data = data.map(d => expandObject(d, ["sources", "subscriptions"], params.expand));

        return applyListOptions(data, params, (id, paramName) => retrieve(accountId, id, paramName));
    }

    export function update(accountId: string, customerId: string, params: Stripe.CustomerUpdateParams): Stripe.Customer {
        log.debug("customers.update", accountId, customerId, params);

        const customer = retrieve(accountId, customerId, "id");

        // All validation must happen above any setting or we can end up with partially
        // updated customers.
        if (params.default_source && !customer.sources.data.find(source => source.id === params.default_source)) {
            throw new RestError(400, {
                code: "resource_missing",
                doc_url: "https://stripe.com/docs/error-codes/resource-missing",
                message: `No such source: ${params.default_source}`,
                param: "source",
                type: "invalid_request_error"
            });
        }

        if (params.address !== undefined) {
            customer.address = charges.getAddressFromParams(params.address);
        }
        if (params.default_source !== undefined) {
            customer.default_source = params.default_source;
        }
        if (params.description !== undefined) {
            customer.description = params.description;
        }
        if (params.email !== undefined) {
            customer.email = params.email;
        }
        if (params.invoice_prefix !== undefined) {
            customer.invoice_prefix = params.invoice_prefix;
        }
        if (params.invoice_settings !== undefined) {
            customer.invoice_settings = params.invoice_settings as Stripe.Customer.InvoiceSettings;
        }
        if (params.metadata !== undefined) {
            customer.metadata = stringifyMetadata(params.metadata);
        }
        if (params.name !== undefined) {
            customer.name = params.name;
        }
        if (params.phone !== undefined) {
            customer.phone = params.phone;
        }
        if (params.preferred_locales !== undefined) {
            customer.preferred_locales = params.preferred_locales;
        }
        if (params.shipping !== undefined) {
            customer.shipping = charges.getShippingFromParams(params.shipping);
        }
        if (params.source !== undefined) {
            createCard(accountId, customer, {source: params.source});
        }
        if (params.tax_exempt !== undefined) {
            customer.tax_exempt = params.tax_exempt;
        }

        return expandObject(
            customer,
            ["sources", "subscriptions"],
            params.expand
        );
    }

    export function addSubscription(accountId: string, customerId: string, subscription: Stripe.Subscription): void {
        const customer = retrieve(accountId, customerId, "customer");
        customer.subscriptions.data.push(subscription);
        customer.next_invoice_sequence++;
        if (!customer.currency) {
            customer.currency = "usd";
        }
    }

    export function createCard(accountId: string, customerOrId: string | Stripe.Customer, params: Stripe.CustomerSourceCreateParams): Stripe.Card {
        log.debug("customers.createCard", accountId, customerOrId, params);

        verify.requiredParams(params, ["source"]);

        const customer = typeof customerOrId === "object" ? customerOrId : retrieve(accountId, customerOrId, "customer");
        if (typeof params.source === "string") {
            const card = cards.createFromSource(params.source);
            card.customer = customer.id;
            if (!customer.default_source) {
                customer.default_source = card.id;
            }
            customer.sources.data.push(card);

            // Special token handling.
            switch (params.source) {
                case "tok_chargeDeclined":
                    throw new RestError(402, {
                        code: "card_declined",
                        decline_code: "generic_decline",
                        doc_url: "https://stripe.com/docs/error-codes/card-declined",
                        message: "Your card was declined.",
                        param: "",
                        type: "card_error"
                    });
                case "tok_chargeDeclinedInsufficientFunds":
                    throw new RestError(402, {
                        code: "card_declined",
                        decline_code: "insufficient_funds",
                        doc_url: "https://stripe.com/docs/error-codes/card-declined",
                        message: "Your card has insufficient funds.",
                        param: "",
                        type: "card_error"
                    });
                case "tok_chargeDeclinedIncorrectCvc":
                    throw new RestError(402, {
                        code: "incorrect_cvc",
                        doc_url: "https://stripe.com/docs/error-codes/incorrect-cvc",
                        message: "Your card's security code is incorrect.",
                        param: "cvc",
                        type: "card_error"
                    });
                case "tok_chargeDeclinedExpiredCard":
                    throw new RestError(402, {
                        code: "expired_card",
                        doc_url: "https://stripe.com/docs/error-codes/expired-card",
                        message: "Your card has expired.",
                        param: "exp_month",
                        type: "card_error"
                    });
            }

            return card;
        } else if (params.source) {
            throw new Error("Card create options on create customer aren't supported.");
        }
    }

    export function retrieveCard(accountId: string, customerId: string, cardId: string, paramName: string): Stripe.Card {
        log.debug("customers.retrieveCard", accountId, customerId, cardId);

        const customer = retrieve(accountId, customerId, "customer", {expand: ["sources"]});
        const card = customer.sources.data.find(card => card.id === cardId && card.object === "card") as Stripe.Card;
        if (!card) {
            throw new RestError(404, {
                code: "resource_missing",
                doc_url: "https://stripe.com/docs/error-codes/resource-missing",
                message: `Customer ${customerId} does not have card with ID ${cardId}`,
                param: paramName,
                type: "invalid_request_error"
            });
        }
        return card;
    }

    export function deleteCard(accountId: string, customerId: string, cardId: string): any {
        log.debug("customers.deleteCard", accountId, customerId, cardId);

        const customer = retrieve(accountId, customerId, "customer", {expand: ["sources"]});
        const card = retrieveCard(accountId, customerId, cardId, "id");
        const cardIx = customer.sources.data.indexOf(card);
        if (cardIx === -1) {
            throw new Error("The world does not make sense.");
        }
        customer.sources.data.splice(cardIx, 1);

        if (customer.default_source === cardId) {
            customer.default_source = customer.sources.data.length ? customer.sources.data[0].id : null;
        }

        // The docs return a full Card object but my tests return this abbreviated thing.  *shrug*
        return {
            id: "card_1FKCxrBCvBiGc7Sdp8LvNQKQ",
            object: "card",
            deleted: true
        };
    }
}
