import Stripe from "stripe";
import {AccountData} from "./AccountData";
import {RestError} from "./RestError";
import {disputes} from "./disputes";
import {applyListOptions, generateId, stringifyMetadata} from "./utils";
import {charges} from "./charges";
import log = require("loglevel");

export namespace refunds {

    const accountRefunds = new AccountData<Stripe.Refund>();

    export function create(accountId: string, params: Stripe.RefundCreateParams): Stripe.Refund {
        log.debug("refunds.create", accountId, params);

        if (params.amount !== undefined) {
            if (params.amount < 1) {
                throw new RestError(400, {
                    code: "parameter_invalid_integer",
                    doc_url: "https://stripe.com/docs/error-codes/parameter-invalid-integer",
                    message: "Invalid positive integer",
                    param: "amount",
                    type: "invalid_request_error"
                });
            }
            if (params.amount > 99999999) {
                throw new RestError(400, {
                    code: "amount_too_large",
                    doc_url: "https://stripe.com/docs/error-codes/amount-too-large",
                    message: "Amount must be no more than $999,999.99",
                    param: "amount",
                    type: "invalid_request_error"
                });
            }
        }

        const charge = charges.retrieve(accountId, params.charge, "id");
        if (charge.amount_refunded >= charge.amount) {
            throw new RestError(400, {
                code: "charge_already_refunded",
                doc_url: "https://stripe.com/docs/error-codes/charge-already-refunded",
                message: `Charge ${charge.id} has already been refunded.`,
                type: "invalid_request_error"
            });
        }
        if (charge.dispute) {
            const dispute = disputes.retrieve(accountId, charge.dispute as string, "dispute");
            if (!dispute.is_charge_refundable) {
                throw new RestError(400, {
                    code: "charge_disputed",
                    doc_url: "https://stripe.com/docs/error-codes/charge-disputed",
                    message: `Charge ${charge.id} has been charged back; cannot issue a refund.`,
                    type: "invalid_request_error"
                });
            }
        }

        const refundAmount = Object.prototype.hasOwnProperty.call(params, "amount") ? +params.amount : charge.amount - charge.amount_refunded;
        if (refundAmount > charge.amount - charge.amount_refunded) {
            throw new RestError(400, {
                message: `Refund amount ($${refundAmount / 100}) is greater than unrefunded amount on charge ($${(charge.amount - charge.amount_refunded) / 100})`,
                param: "amount",
                type: "invalid_request_error"
            });
        }

        if (!charge.captured && charge.amount !== refundAmount) {
            throw new RestError(400, {
                message: "You cannot partially refund an uncaptured charge. Instead, capture the charge for an amount less than the original amount",
                param: "amount",
                type: "invalid_request_error"
            });
        }

        const refund: Stripe.Refund = {
            id: "re_" + generateId(24),
            object: "refund",
            amount: refundAmount,
            balance_transaction: "txn_" + generateId(24),
            charge: charge.id,
            created: (Date.now() / 1000) | 0,
            currency: charge.currency.toLowerCase(),
            metadata: stringifyMetadata(params.metadata),
            payment_intent: null,
            reason: params.reason || null,
            receipt_number: null,
            source_transfer_reversal: null,
            status: "succeeded",
            transfer_reversal: null
        };
        charge.refunds.data.unshift(refund);
        charge.amount_refunded += refundAmount;
        charge.refunded = charge.amount_refunded === charge.amount;
        accountRefunds.put(accountId, refund);
        return refund;
    }

    export function retrieve(accountId: string, refundId: string, paramName: string): Stripe.Refund {
        log.debug("refunds.retrieve", accountId, refundId);

        const refund = accountRefunds.get(accountId, refundId);
        if (!refund) {
            throw new RestError(404, {
                code: "resource_missing",
                doc_url: "https://stripe.com/docs/error-codes/resource-missing",
                message: `No such refund: ${refundId}`,
                param: paramName,
                type: "invalid_request_error"
            });
        }
        return refund;
    }

    export function list(accountId: string, params: Stripe.RefundListParams): Stripe.ApiList<Stripe.Refund> {
        log.debug("refunds.list", accountId, params);

        let data: Stripe.Refund[] = accountRefunds.getAll(accountId);
        if (params.charge) {
            data = data.filter(d => d.charge === params.charge);
        }
        return applyListOptions(data, params, (id, paramName) => retrieve(accountId, id, paramName));
    }
}
