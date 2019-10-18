import * as stripe from "stripe";
import log = require("loglevel");
import {AccountData} from "./AccountData";
import {generateId} from "./utils";
import {StripeError} from "./StripeError";

export namespace disputes {

    const accountDisputes = new AccountData<stripe.disputes.IDispute>();

    export function createFromSource(accountId: string, token: string, charge: stripe.charges.ICharge): stripe.disputes.IDispute {
        log.debug("disputes.createFromSource", accountId, token);

        // Something like 4 business days at 5pm.  May not be exactly right.
        const transactionAvailableDate = addBusinessDays(new Date(), 4);
        transactionAvailableDate.setHours(17);
        transactionAvailableDate.setMinutes(0, 0, 0);

        // Something like 7 business days at 4:59:59pm.  May not be exactly right.
        const evidenceDueDate = addBusinessDays(new Date(), 7);
        transactionAvailableDate.setHours(17);
        transactionAvailableDate.setMinutes(0, 0, -1);

        const disputeId = `dp_${generateId(24)}`;
        const disputeTxnId = `txn_${generateId(24)}`;
        const dispute: stripe.disputes.IDispute = {
            id: disputeId,
            object: "dispute",
            amount: +charge.amount,
            balance_transactions: [
                {
                    id: disputeTxnId,
                    object: "balance_transaction",
                    amount: -charge.amount,
                    available_on: (transactionAvailableDate.getTime() / 1000) | 0,
                    created: (Date.now() / 1000) | 0,
                    currency: charge.currency,
                    description: `Chargeback withdrawal for ${charge.id}`,
                    exchange_rate: null,
                    fee: 1500,
                    fee_details: [
                        {
                            amount: 1500,
                            application: null,
                            currency: charge.currency,
                            description: "Dispute fee",
                            type: "stripe_fee"
                        }
                    ],
                    net: -charge.amount - 1500,
                    source: `dp_${generateId(24)}`,
                    status: "pending",
                    type: "adjustment"
                }
            ],
            charge: charge.id,
            created: (Date.now() / 1000) | 0,
            currency: charge.currency,
            evidence: {
                access_activity_log: null,
                billing_address: null,
                cancellation_policy: null,
                cancellation_policy_disclosure: null,
                cancellation_rebuttal: null,
                customer_communication: null,
                customer_email_address: null,
                customer_name: null,
                customer_purchase_ip: null,
                customer_signature: null,
                duplicate_charge_documentation: null,
                duplicate_charge_explanation: null,
                duplicate_charge_id: null,
                product_description: null,
                receipt: null,
                refund_policy: null,
                refund_policy_disclosure: null,
                refund_refusal_explanation: null,
                service_date: null,
                service_documentation: null,
                shipping_address: null,
                shipping_carrier: null,
                shipping_date: null,
                shipping_documentation: null,
                shipping_tracking_number: null,
                uncategorized_file: null,
                uncategorized_text: null
            },
            evidence_details: {
                due_by: (evidenceDueDate.getTime() / 1000) | 0,
                has_evidence: false,
                past_due: false,
                submission_count: 0
            },
            is_charge_refundable: false,
            livemode: false,
            metadata: {
            },
            reason: "fraudulent",
            status: "needs_response"
        };

        switch (token) {
            case "tok_createDispute":
                // Default values.
                break;
            case "tok_createDisputeProductNotReceived":
                dispute.reason = "product_not_received";
                break;
            case "tok_createDisputeInquiry":
                dispute.status = "warning_needs_response";
                dispute.is_charge_refundable = true;
                break;
            default:
                throw new Error(`Unhandled dispute source token ${token}`);
        }

        accountDisputes.put(accountId, dispute);
        return dispute;
    }

    export function retrieve(accountId: string, disputeId: string, paramName: string): stripe.disputes.IDispute {
        log.debug("dispute.retrieve", accountId, disputeId, paramName);

        const dispute = accountDisputes.get(accountId, disputeId);
        if (!dispute) {
            throw new StripeError(404, {
                code: "resource_missing",
                doc_url: "https://stripe.com/docs/error-codes/resource-missing",
                message: `No such dispute: ${disputeId}`,
                param: paramName,
                type: "invalid_request_error"
            });
        }
        return dispute;
    }

    /**
     * https://gist.github.com/psdtohtml5/7000529
     */
    function addBusinessDays(d: Date, n: number): Date {
        d = new Date(d.getTime());
        const day = d.getDay();
        d.setDate(d.getDate() + n + (day === 6 ? 2 : +!day) + (Math.floor((n - 1 + (day % 6 || 1)) / 5) * 2));
        return d;
    }
}
