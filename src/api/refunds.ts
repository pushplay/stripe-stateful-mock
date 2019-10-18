import * as stripe from "stripe";
import log = require("loglevel");
import {AccountData} from "./AccountData";
import {StripeError} from "./StripeError";
import {disputes} from "./disputes";
import {generateId, stringifyMetadata} from "./utils";
import {charges} from "./charges";

export namespace refunds {

    const accountRefunds = new AccountData<stripe.refunds.IRefund>();

    export function create(accountId: string, params: stripe.refunds.IRefundCreationOptionsWithCharge): stripe.refunds.IRefund {
        log.debug("refunds.create", accountId, params);

        if (params.hasOwnProperty("amount")) {
            if (params.amount < 1) {
                throw new StripeError(400, {
                    code: "parameter_invalid_integer",
                    doc_url: "https://stripe.com/docs/error-codes/parameter-invalid-integer",
                    message: "Invalid positive integer",
                    param: "amount",
                    type: "invalid_request_error"
                });
            }
            if (params.amount > 99999999) {
                throw new StripeError(400, {
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
            throw new StripeError(400, {
                code: "charge_already_refunded",
                doc_url: "https://stripe.com/docs/error-codes/charge-already-refunded",
                message: `Charge ${charge.id} has already been refunded.`,
                type: "invalid_request_error"
            });
        }
        if (charge.dispute) {
            const dispute = disputes.retrieve(accountId, charge.dispute as string, "dispute");
            if (!dispute.is_charge_refundable) {
                throw new StripeError(400, {
                    code: "charge_disputed",
                    doc_url: "https://stripe.com/docs/error-codes/charge-disputed",
                    message: `Charge ${charge.id} has been charged back; cannot issue a refund.`,
                    type: "invalid_request_error"
                });
            }
        }

        let refundAmount = params.hasOwnProperty("amount") ? +params.amount : charge.amount - charge.amount_refunded;
        if (refundAmount > charge.amount - charge.amount_refunded) {
            throw new StripeError(400, {
                message: `Refund amount (\$${refundAmount / 100}) is greater than unrefunded amount on charge (\$${(charge.amount - charge.amount_refunded) / 100})`,
                param: "amount",
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

        const refund: stripe.refunds.IRefund = {
            id: "re_" + generateId(24),
            object: "refund",
            amount: refundAmount,
            balance_transaction: "txn_" + generateId(24),
            charge: charge.id,
            created: (Date.now() / 1000) | 0,
            currency: charge.currency.toLowerCase(),
            metadata: stringifyMetadata(params.metadata),
            reason: params.reason || null,
            receipt_number: null,
            source_transfer_reversal: null,
            status: "succeeded",
            transfer_reversal: null
        };
        charge.refunds.data.unshift(refund);
        charge.refunds.total_count++;
        charge.amount_refunded += refundAmount;
        charge.refunded = charge.amount_refunded === charge.amount;
        accountRefunds.put(accountId, refund);
        return refund;
    }

    export function retrieve(accountId: string, refundId: string, paramName: string): stripe.refunds.IRefund {
        log.debug("refunds.retrieve", accountId, refundId);

        const refund = accountRefunds.get(accountId, refundId);
        if (!refund) {
            throw new StripeError(404, {
                code: "resource_missing",
                doc_url: "https://stripe.com/docs/error-codes/resource-missing",
                message: `No such refund: ${refundId}`,
                param: paramName,
                type: "invalid_request_error"
            });
        }
        return refund;
    }

    export function list(accountId: string, params: stripe.refunds.IRefundListOptions): stripe.IList<stripe.refunds.IRefund> {
        log.debug("refunds.list", accountId, params);
        let refunds: stripe.refunds.IRefund[] = accountRefunds.getAll(accountId);
        let hasMore = false;
        if (params.charge) {
            refunds = refunds.filter(refund => refund.charge === params.charge);
        }
        if (params.starting_after) {
            const startingAfter = retrieve(accountId, params.starting_after, "starting_after");
            const startingAfterIx = refunds.indexOf(startingAfter);
            refunds = refunds.slice(startingAfterIx + 1);
            if (params.limit && refunds.length > params.limit) {
                refunds = refunds.slice(0, params.limit);
                hasMore = true;
            }
        } else if (params.ending_before) {
            const endingBefore = retrieve(accountId, params.ending_before, "ending_before");
            const endingBeforeIx = refunds.indexOf(endingBefore);
            refunds = refunds.slice(0, endingBeforeIx);
            if (params.limit && refunds.length > params.limit) {
                refunds = refunds.slice(refunds.length - params.limit);
                hasMore = true;
            }
        } else if (params.limit && refunds.length > params.limit) {
            refunds = refunds.slice(0, params.limit);
            hasMore = true;
        }
        return {
            object: "list",
            data: refunds,
            has_more: hasMore,
            url: "/v1/refunds"
        };
    }
}
