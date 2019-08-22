import * as stripe from "stripe";
import log = require("loglevel");
import StripeError from "./StripeError";
import {generateId, stringifyMetadata} from "./utils";

namespace charges {
    
    const existingCharges: {[id: string]: stripe.charges.ICharge} = {};

    const validCurrencies = ["usd", " aed", " afn", " all", " amd", " ang", " aoa", " ars", " aud", " awg", " azn", " bam", " bbd", " bdt", " bgn", " bif", " bmd", " bnd", " bob", " brl", " bsd", " bwp", " bzd", " cad", " cdf", " chf", " clp", " cny", " cop", " crc", " cve", " czk", " djf", " dkk", " dop", " dzd", " egp", " etb", " eur", " fjd", " fkp", " gbp", " gel", " gip", " gmd", " gnf", " gtq", " gyd", " hkd", " hnl", " hrk", " htg", " huf", " idr", " ils", " inr", " isk", " jmd", " jpy", " kes", " kgs", " khr", " kmf", " krw", " kyd", " kzt", " lak", " lbp", " lkr", " lrd", " lsl", " mad", " mdl", " mga", " mkd", " mmk", " mnt", " mop", " mro", " mur", " mvr", " mwk", " mxn", " myr", " mzn", " nad", " ngn", " nio", " nok", " npr", " nzd", " pab", " pen", " pgk", " php", " pkr", " pln", " pyg", " qar", " ron", " rsd", " rub", " rwf", " sar", " sbd", " scr", " sek", " sgd", " shp", " sll", " sos", " srd", " std", " szl", " thb", " tjs", " top", " try", " ttd", " twd", " tzs", " uah", " ugx", " uyu", " uzs", " vnd", " vuv", " wst", " xaf", " xcd", " xof", " xpf", " yer", " zar", " zmw", " eek", " lvl", " svc", " vef"];

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

        if (validCurrencies.indexOf(params.currency) === -1) {
            throw new StripeError(400, {
                message: `Invalid currency: ${params.currency}. Stripe currently supports these currencies: ${validCurrencies.join(", ")}`,
                param: "currency",
                type: "invalid_request_error"
            });
        }
        if (minChargeAmount[params.currency] && +params.amount < minChargeAmount[params.currency]) {
            throw new StripeError(400, {
                code: "amount_too_small",
                doc_url: "https://stripe.com/docs/error-codes/amount-too-small",
                message: "Amount must be at least 50 cents",
                param: "amount",
                type: "invalid_request_error"
            });
        }

        const source = getSourceFromToken(params.source as string);
        const charge = getChargeFromCard(params, source);
        existingCharges[charge.id] = charge;

        // Chance to modify the stored charge and throw an error.
        switch (params.source) {
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
                charge.status = "failed";
                throw new StripeError(402, {
                    charge: charge.id,
                    code: "card_declined",
                    decline_code: "insufficient_funds",
                    doc_url: "https://stripe.com/docs/error-codes/card-declined",
                    message: "Your card has insufficient funds.",
                    type: "card_error"
                });
        }

        return charge;
    }

    export function retrieve(chargeId: string): stripe.charges.ICharge {
        const charge = existingCharges[chargeId];
        if (!charge) {
            throw new StripeError(404, {
                code: "resource_missing",
                doc_url: "https://stripe.com/docs/error-codes/resource-missing",
                message: "No such charge: ch_11F7tEJ2eZvKYlo2CIJa4oCCQ",
                param: "id",
                type: "invalid_request_error"
            })
        }
        return charge;
    }

    export function capture(chargeId: string, params: stripe.charges.IChargeCaptureOptions): stripe.charges.ICharge {
        const charge = retrieve(chargeId);

        if (charge.captured) {
            throw new StripeError(400, {
                code: "charge_already_captured",
                doc_url: "https://stripe.com/docs/error-codes/charge-already-captured",
                message: "Charge ch_1FAOQz2eZvKYlo2CVwG2N5Kl has already been captured.",
                type: "invalid_request_error"
            });
        }

        let captureAmount = params.hasOwnProperty("amount") ? params.amount : charge.amount;
        if (captureAmount < 1) {
            throw new StripeError(400, {
                code: "parameter_invalid_integer",
                doc_url: "https://stripe.com/docs/error-codes/parameter-invalid-integer",
                message: "Invalid positive integer",
                param: "amount",
                type: "invalid_request_error"
            });
        } else if (minChargeAmount[charge.currency] && +params.amount < minChargeAmount[charge.currency]) {
            throw new StripeError(400, {
                code: "amount_too_small",
                doc_url: "https://stripe.com/docs/error-codes/amount-too-small",
                message: "Amount must be at least 50 cents",
                type: "invalid_request_error"
            });
        } else if (captureAmount < charge.amount) {
            refundCharge(charge.amount - captureAmount, charge, {});
        }

        charge.captured = true;

        return charge;
    }

    function getSourceFromToken(token: string): stripe.cards.ICard {
        const now = new Date();
        const source: stripe.cards.ICard = {
            id: "card_" + generateId(24),
            object: "card",
            address_city: null,
            address_country: null,
            address_line1: null,
            address_line1_check: null,
            address_line2: null,
            address_state: null,
            address_zip: null,
            address_zip_check: null,
            brand: "Unknown",
            country: "US",
            customer: null,
            cvc_check: null,
            dynamic_last4: null,
            exp_month: now.getMonth() + 1,
            exp_year: now.getFullYear() + 1,
            fingerprint: generateId(16),
            funding: "credit",
            last4: "XXXX",
            metadata: {
            },
            name: null,
            tokenization_method: null
        };

        switch (token) {
            case "tok_visa":
                source.brand = "Visa";
                source.last4 = "4242";
                break;
            case "tok_visa_debit":
                source.brand = "Visa";
                source.last4 = "5556";
                break;
            case "tok_mastercard":
                source.brand = "MasterCard";
                source.last4 = "4444";
                break;
            case "tok_mastercard_debit":
                source.brand = "MasterCard";
                source.last4 = "3222";
                break;
            case "tok_mastercard_prepaid":
                source.brand = "MasterCard";
                source.last4 = "5100";
                break;
            case "tok_amex":
                source.brand = "American Express";
                source.last4 = "8431";
                break;
            case "tok_ca":      // CRTC approved.
                source.brand = "Visa";
                source.last4 = "0000";
                source.country = "CA";
                break;
            case "tok_chargeDeclined":
                source.brand = "Visa";
                source.last4 = "0002";
                break;
            case "tok_chargeDeclinedInsufficientFunds":
                source.brand = "Visa";
                source.last4 = "9995";
                break;
            default:
                throw new Error("Unhandled source token");
        }

        return source;
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
            currency: params.currency,
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

    function refundCharge(amount: number, charge: stripe.charges.ICharge, params: {metadata?: stripe.IOptionsMetadata}): void {
        const now = new Date();
        charge.amount_refunded += amount;
        charge.refunds.data.push({
            id: "re_" + generateId(24),
            object: "refund",
            amount: amount,
            balance_transaction: "txn_" + generateId(24),
            charge: charge.id,
            created: (now.getTime() / 1000) | 0,
            currency: charge.currency,
            description: "",    // not in live API
            metadata: stringifyMetadata(params.metadata),
            reason: null,
            receipt_number: null,
            // source_transfer_reversal: null,
            status: "succeeded",
            // transfer_reversal: null
        });
        charge.refunds.total_count++;
    }
}

export default charges;
