import * as stripe from "stripe";
import log = require("loglevel");
import StripeError from "./StripeError";
import {generateId, stringifyMetadata} from "./utils";
import {getEffectiveSourceTokenFromChain, isSourceTokenChain} from "./sourceTokenChains";
import cards from "./cards";
import customers from "./customers";

namespace charges {
    
    const existingCharges: {[id: string]: stripe.charges.ICharge} = {};

    const validCurrencies = ["usd", "aed", "afn", "all", "amd", "ang", "aoa", "ars", "aud", "awg", "azn", "bam", "bbd", "bdt", "bgn", "bif", "bmd", "bnd", "bob", "brl", "bsd", "bwp", "bzd", "cad", "cdf", "chf", "clp", "cny", "cop", "crc", "cve", "czk", "djf", "dkk", "dop", "dzd", "egp", "etb", "eur", "fjd", "fkp", "gbp", "gel", "gip", "gmd", "gnf", "gtq", "gyd", "hkd", "hnl", "hrk", "htg", "huf", "idr", "ils", "inr", "isk", "jmd", "jpy", "kes", "kgs", "khr", "kmf", "krw", "kyd", "kzt", "lak", "lbp", "lkr", "lrd", "lsl", "mad", "mdl", "mga", "mkd", "mmk", "mnt", "mop", "mro", "mur", "mvr", "mwk", "mxn", "myr", "mzn", "nad", "ngn", "nio", "nok", "npr", "nzd", "pab", "pen", "pgk", "php", "pkr", "pln", "pyg", "qar", "ron", "rsd", "rub", "rwf", "sar", "sbd", "scr", "sek", "sgd", "shp", "sll", "sos", "srd", "std", "szl", "thb", "tjs", "top", "try", "ttd", "twd", "tzs", "uah", "ugx", "uyu", "uzs", "vnd", "vuv", "wst", "xaf", "xcd", "xof", "xpf", "yer", "zar", "zmw", "eek", "lvl", "svc", "vef"];

    const minChargeAmount: { [code: string]: number } = {
        usd: 50,
        aud: 50,
        brl: 50,
        cad: 50,
        chf: 50,
        dkk: 250,
        eur: 50,
        hkd: 400,
        jpy: 50,
        mxn: 10,
        nok: 300,
        nzd: 50,
        sek: 300,
        sgd: 50
    };

    const bigBrandToSmallBrandMap: {[brand: string]: stripe.paymentMethods.CardBrand} = {
        "Visa": "visa",
        "American Express": "amex",
        "MasterCard": "mastercard",
        "Discover": "discover",
        "JCB": "jcb",
        "Diners Club": "diners",
        "Unknown": "unknown"
    };

    export function create(params: stripe.charges.IChargeCreationOptions): stripe.charges.ICharge {
        log.debug("create charge", params);

        if (params.source === "tok_500") {
            // It's rarely seen but this is what Stripe's 500s look like.
            throw new StripeError(500, {
                message: "An unknown error occurred",
                type: "api_error"
            });
        }
        if (validCurrencies.indexOf(params.currency.toLowerCase()) === -1) {
            throw new StripeError(400, {
                message: `Invalid currency: ${params.currency.toLowerCase()}. Stripe currently supports these currencies: ${validCurrencies.join(", ")}`,
                param: "currency",
                type: "invalid_request_error"
            });
        }
        if (minChargeAmount[params.currency.toLowerCase()] && +params.amount < minChargeAmount[params.currency.toLowerCase()]) {
            throw new StripeError(400, {
                code: "amount_too_small",
                doc_url: "https://stripe.com/docs/error-codes/amount-too-small",
                message: "Amount must be at least 50 cents",
                param: "amount",
                type: "invalid_request_error"
            });
        }

        let charge: stripe.charges.ICharge;
        if (typeof params.source === "string") {
            let sourceToken = params.source;
            if (isSourceTokenChain(sourceToken)) {
                sourceToken = getEffectiveSourceTokenFromChain(sourceToken);
            }

            if (sourceToken === "tok_500") {
                // It's rarely seen but this is what Stripe's 500s look like.
                throw new StripeError(500, {
                    message: "An unknown error occurred",
                    type: "api_error"
                });
            }

            const card = cards.createFromSource(sourceToken);
            charge = getChargeFromCard(params, card);
            existingCharges[charge.id] = charge;
            handleSpecialChargeTokens(charge, sourceToken);
        } else if (typeof params.customer === "string") {
            const customer = customers.retrieve(params.customer, "customer");
            if (!customer.default_source) {
                throw new StripeError(500, {
                    code: "missing",
                    doc_url: "https://stripe.com/docs/error-codes/missing",
                    message: "Cannot charge a customer that has no active card",
                    param: "card",
                    type: "card_error"
                });
            }

            if (typeof customer.default_source === "string") {
                const card = customers.retrieveCard(customer.id, customer.default_source);
                const cardExtra = cards.getCardExtra(card.id);
                charge = getChargeFromCard(params, card);
                existingCharges[charge.id] = charge;
                handleSpecialChargeTokens(charge, cardExtra.sourceToken);
            } else {
                throw new Error("Customer default_source type not handled.");
            }
        } else {
            throw new StripeError(400, {
                code: "parameter_missing",
                doc_url: "https://stripe.com/docs/error-codes/parameter-missing",
                message: "Must provide source or customer.",
                type: "invalid_request_error"
            });
        }

        return charge;
    }

    export function retrieve(chargeId: string, param: string): stripe.charges.ICharge {
        const charge = existingCharges[chargeId];
        if (!charge) {
            throw new StripeError(404, {
                code: "resource_missing",
                doc_url: "https://stripe.com/docs/error-codes/resource-missing",
                message: `No such charge: ${chargeId}`,
                param: param,
                type: "invalid_request_error"
            });
        }
        return charge;
    }

    export function update(chargeId: string, params: stripe.charges.IChargeUpdateOptions): stripe.charges.ICharge {
        const charge = retrieve(chargeId, "id");

        if (params.hasOwnProperty("description")) {
            charge.description = params.description;
        }
        if (params.hasOwnProperty("fraud_details")) {
            charge.fraud_details = params.fraud_details;
        }
        if (params.hasOwnProperty("metadata")) {
            charge.metadata = stringifyMetadata(params.metadata);
        }
        if (params.hasOwnProperty("receipt_email")) {
            charge.receipt_email = params.receipt_email;
        }
        if (params.hasOwnProperty("shipping")) {
            charge.shipping = params.shipping;
        }

        return charge;
    }

    export function capture(chargeId: string, params: stripe.charges.IChargeCaptureOptions): stripe.charges.ICharge {
        const charge = existingCharges[chargeId];
        if (!charge) {
            throw new StripeError(404, {
                code: "resource_missing",
                doc_url: "https://stripe.com/docs/error-codes/resource-missing",
                message: `No such charge: ${chargeId}`,
                param: "charge",
                type: "invalid_request_error"
            });
        }

        if (charge.captured) {
            throw new StripeError(400, {
                code: "charge_already_captured",
                doc_url: "https://stripe.com/docs/error-codes/charge-already-captured",
                message: "Charge ch_1FAOQz2eZvKYlo2CVwG2N5Kl has already been captured.",
                type: "invalid_request_error"
            });
        }

        let captureAmount = params.hasOwnProperty("amount") ? +params.amount : charge.amount;
        if (captureAmount < 1) {
            throw new StripeError(400, {
                code: "parameter_invalid_integer",
                doc_url: "https://stripe.com/docs/error-codes/parameter-invalid-integer",
                message: "Invalid positive integer",
                param: "amount",
                type: "invalid_request_error"
            });
        }
        if (minChargeAmount[charge.currency.toLowerCase()] && +params.amount < minChargeAmount[charge.currency.toLowerCase()]) {
            throw new StripeError(400, {
                code: "amount_too_small",
                doc_url: "https://stripe.com/docs/error-codes/amount-too-small",
                message: "Amount must be at least 50 cents",
                type: "invalid_request_error"
            });
        }

        if (captureAmount < charge.amount) {
            charge.captured = true;
            createRefund({
                amount: charge.amount - captureAmount,
                charge: charge.id
            });
        } else {
            charge.captured = true;
        }

        return charge;
    }

    export function createRefund(params: stripe.refunds.IRefundCreationOptionsWithCharge): stripe.refunds.IRefund {
        const charge = retrieve(params.charge, "id");

        let refundAmount = params.hasOwnProperty("amount") ? +params.amount : charge.amount;
        if (refundAmount < 1) {
            throw new StripeError(400, {
                code: "parameter_invalid_integer",
                doc_url: "https://stripe.com/docs/error-codes/parameter-invalid-integer",
                message: "Invalid positive integer",
                param: "amount",
                type: "invalid_request_error"
            });
        }
        if (refundAmount > charge.amount - charge.amount_refunded) {
            throw new StripeError(400, {
                code: "amount_too_large",
                doc_url: "https://stripe.com/docs/error-codes/amount-too-large",
                message: "Amount must be no more than $999,999.99",
                type: "invalid_request_error"
            });
        }

        if (!charge.captured && charge.amount !== refundAmount) {
            throw new StripeError(400, {
                message: "You cannot partially refund an uncaptured charge. Instead, capture the charge for an amount less than the original amount",
                param: "amount",
                type: "invalid_request_error"
            });
        }

        const now = new Date();
        const refund: stripe.refunds.IRefund = {
            id: "re_" + generateId(24),
            object: "refund",
            amount: refundAmount,
            balance_transaction: "txn_" + generateId(24),
            charge: charge.id,
            created: (now.getTime() / 1000) | 0,
            currency: charge.currency.toLowerCase(),
            description: "",    // not in live API
            metadata: stringifyMetadata(params.metadata),
            reason: null,
            receipt_number: null,
            // source_transfer_reversal: null,
            status: "succeeded",
            // transfer_reversal: null
        };
        charge.refunds.data.unshift(refund);
        charge.refunds.total_count++;
        charge.amount_refunded += refundAmount;
        charge.refunded = charge.amount_refunded === charge.amount;
        return refund;
    }

    export function retrieveRefund(refundId: string, param: string): stripe.refunds.IRefund {
        for (const chargeId in existingCharges) {
            const refund = existingCharges[chargeId].refunds.data.find(refund => refund.id === refundId);
            if (refund) {
                return refund;
            }
        }

        throw new StripeError(404, {
            code: "resource_missing",
            doc_url: "https://stripe.com/docs/error-codes/resource-missing",
            message: `No such refund: ${refundId}`,
            param: param,
            type: "invalid_request_error"
        });
    }

    function getChargeFromCard(params: stripe.charges.IChargeCreationOptions, source: stripe.cards.ICard): stripe.charges.ICharge {
        const now = new Date();
        const chargeId = "ch_" + generateId();
        return {
            id: chargeId,
            object: "charge",
            amount: +params.amount,
            amount_refunded: 0,
            application: null,
            application_fee: null,
            // application_fee_amount: null,
            balance_transaction: "txn_" + generateId(24),
            // billing_details: {
            //     address: {
            //         city: null,
            //         country: null,
            //         line1: null,
            //         line2: null,
            //         postal_code: null,
            //         state: null
            //     },
            //     email: null,
            //     name: null,
            //     phone: null
            // },
            captured: params.capture as any !== "false",
            created: (now.getTime() / 1000) | 0,
            currency: params.currency.toLowerCase(),
            customer: null,
            description: params.description || null,
            destination: null,
            dispute: null,
            failure_code: null,
            failure_message: null,
            fraud_details: {
            },
            invoice: null,
            livemode: false,
            metadata: stringifyMetadata(params.metadata),
            on_behalf_of: null,
            order: null,
            outcome: {
                network_status: "approved_by_network",
                reason: null,
                risk_level: "normal",
                //risk_score: 5,  // This is in the response I get from Stripe but not the type def.
                seller_message: "Payment complete.",
                type: "authorized"
            },
            paid: true,
            payment_intent: null,
            payment_method: "card_" + generateId(24),
            payment_method_details: {
                card: {
                    brand: bigBrandToSmallBrandMap[source.brand],
                    checks: {
                        address_line1_check: null,
                        address_postal_code_check: null,
                        cvc_check: null
                    },
                    country: source.country,
                    exp_month: source.exp_month,
                    exp_year: source.exp_year,
                    fingerprint: generateId(16),
                    funding: source.funding,
                    last4: source.last4,
                    three_d_secure: null,
                    wallet: null
                },
                type: "card"
            },
            receipt_email: params.receipt_email || null,
            receipt_number: null,
            receipt_url: `https://pay.stripe.com/receipts/acct_${generateId(16)}/${chargeId}/rcpt_${generateId(32)}`,
            refunded: false,
            refunds: {
                object: "list",
                data: [
                ],
                has_more: false,
                total_count: 0,
                url: `/v1/charges/${chargeId}/refunds`
            },
            review: null,
            shipping: null,
            source: source,
            source_transfer: null,
            statement_descriptor: null,
            // statement_descriptor_suffix: null,
            status: "succeeded",
            // transfer_data: null,
            transfer_group: params.transfer_group || null
        };
    }

    function handleSpecialChargeTokens(charge: stripe.charges.ICharge, sourceToken: string): void {
        switch (sourceToken) {
            case "tok_chargeDeclined":
                charge.failure_code = "card_declined";
                charge.failure_message = "Your card was declined.";
                charge.outcome = {
                    network_status: "declined_by_network",
                    reason: "generic_decline",
                    risk_level: "normal",
                    // risk_score: 63,
                    seller_message: "The bank did not return any further details with this decline.",
                    type: "issuer_declined"
                };
                charge.paid = false;
                charge.status = "failed";
                throw new StripeError(402, {
                    charge: charge.id,
                    code: "card_declined",
                    decline_code: "generic_decline",
                    doc_url: "https://stripe.com/docs/error-codes/card-declined",
                    message: "Your card was declined.",
                    type: "card_error"
                });
            case "tok_chargeDeclinedInsufficientFunds":
                charge.failure_code = "card_declined";
                charge.failure_message = "Your card has insufficient funds.";
                charge.outcome = {
                    network_status: "declined_by_network",
                    reason: "generic_decline",
                    risk_level: "normal",
                    // risk_score: 63,
                    seller_message: "The bank did not return any further details with this decline.",
                    type: "issuer_declined"
                };
                charge.paid = false;
                charge.status = "failed";
                throw new StripeError(402, {
                    charge: charge.id,
                    code: "card_declined",
                    decline_code: "insufficient_funds",
                    doc_url: "https://stripe.com/docs/error-codes/card-declined",
                    message: "Your card has insufficient funds.",
                    type: "card_error"
                });
            case "tok_chargeDeclinedIncorrectCvc":
                charge.failure_code = "incorrect_cvc";
                charge.failure_message = "Your card's security code is incorrect.";
                charge.outcome = {
                    network_status: "declined_by_network",
                    reason: "incorrect_cvc",
                    risk_level: "normal",
                    // risk_score: 63,
                    seller_message: "The bank returned the decline code `incorrect_cvc`.",
                    type: "issuer_declined"
                };
                charge.paid = false;
                charge.status = "failed";
                throw new StripeError(402, {
                    charge: charge.id,
                    code: "incorrect_cvc",
                    doc_url: "https://stripe.com/docs/error-codes/incorrect-cvc",
                    message: "Your card's security code is incorrect.",
                    param: "cvc",
                    type: "card_error"
                });
            case "tok_chargeDeclinedExpiredCard":
                charge.failure_code = "expired_card";
                charge.failure_message = "Your card has expired.";
                charge.outcome = {
                    network_status: "declined_by_network",
                    reason: "expired_card",
                    risk_level: "normal",
                    // risk_score: 63,
                    seller_message: "The bank returned the decline code `expired_card`.",
                    type: "issuer_declined"
                };
                charge.paid = false;
                charge.status = "failed";
                throw new StripeError(402, {
                    charge: charge.id,
                    code: "expired_card",
                    doc_url: "https://stripe.com/docs/error-codes/expired-card",
                    message: "Your card has expired.",
                    param: "exp_month",
                    type: "card_error"
                });
        }
    }
}

export default charges;
