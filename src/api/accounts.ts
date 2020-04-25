import Stripe from "stripe";
import {applyListOptions, generateId, stringifyMetadata} from "./utils";
import {RestError} from "./RestError";
import {verify} from "./verify";
import log = require("loglevel");

export namespace accounts {

    const accounts: { [accountId: string]: Stripe.Account } = {};

    export function create(accountId: string, params: Stripe.AccountCreateParams): Stripe.Account {
        log.debug("accounts.create", accountId, params);

        if (accountId !== "acct_default") {
            throw new RestError(400, {
                message: "You can only create new accounts if you've signed up for Connect, which you can learn how to do at https://stripe.com/docs/connect.",
                type: "invalid_request_error"
            });
        }
        verify.requiredParams(params, ["type"]);

        const connectedAccountId = (params as any).id || `acct_${generateId(16)}`;
        const account: Stripe.Account = {
            id: connectedAccountId,
            object: "account",
            business_profile: {
                mcc: params.business_profile?.mcc || null,
                name: params.business_profile?.name || "Stripe.com",
                product_description: params.business_profile?.product_description || null,
                support_address: null,  // meh
                support_email: params.business_profile?.support_email || null,
                support_phone: params.business_profile?.support_phone || null,
                support_url: params.business_profile?.support_url || null,
                url: params.business_profile?.url || null
            },
            business_type: params.business_type || null,
            capabilities: {},
            charges_enabled: false,
            country: params.country || "US",
            created: (Date.now() / 1000) | 0,
            default_currency: params.default_currency || "usd",
            details_submitted: false,
            email: params.email || "site@stripe.com",
            external_accounts: {
                object: "list",
                data: [],
                has_more: false,
                url: `/v1/accounts/${connectedAccountId}/external_accounts`
            },
            metadata: stringifyMetadata(params.metadata),
            payouts_enabled: false,
            requirements: {
                current_deadline: null,
                currently_due: [
                    "business_type",
                    "business_url",
                    "company.address.city",
                    "company.address.line1",
                    "company.address.postal_code",
                    "company.address.state",
                    "person_8UayFKIMRJklog.dob.day",
                    "person_8UayFKIMRJklog.dob.month",
                    "person_8UayFKIMRJklog.dob.year",
                    "person_8UayFKIMRJklog.first_name",
                    "person_8UayFKIMRJklog.last_name",
                    "product_description",
                    "support_phone",
                    "tos_acceptance.date",
                    "tos_acceptance.ip"
                ],
                disabled_reason: "requirements.past_due",
                errors: [],
                eventually_due: [
                    "business_url",
                    "product_description",
                    "support_phone",
                    "tos_acceptance.date",
                    "tos_acceptance.ip"
                ],
                past_due: [],
                pending_verification: []
            },
            settings: {
                branding: {
                    icon: params?.settings?.branding?.icon || null,
                    logo: params?.settings?.branding?.logo || null,
                    primary_color: params?.settings?.branding?.primary_color || null,
                    secondary_color: params?.settings?.branding?.secondary_color || null,
                },
                card_payments: {
                    decline_on: {
                        avs_failure: true,
                        cvc_failure: false
                    },
                    statement_descriptor_prefix: null
                },
                dashboard: {
                    display_name: "Stripe.com",
                    timezone: "US/Pacific"
                },
                payments: {
                    statement_descriptor: "",
                    statement_descriptor_kana: null,
                    statement_descriptor_kanji: null
                },
                payouts: {
                    debit_negative_balances: true,
                    schedule: {
                        delay_days: 7,
                        interval: "daily"
                    },
                    statement_descriptor: null
                }
            },
            tos_acceptance: {
                date: params.tos_acceptance?.date || null,
                ip: params.tos_acceptance?.ip || null,
                user_agent: params.tos_acceptance?.user_agent || null
            },
            type: params.type
        };
        accounts[connectedAccountId] = account;

        if (params.type as any === "standard") {
            // Can't create standard accounts in the real API but this is a useful thing for
            // a mock server to do.  Standard accounts are missing these properties.
            delete account.company;
            delete account.created;
            delete account.external_accounts;
            delete account.individual;
            delete account.requirements;
            delete account.tos_acceptance;
        }
        if (params.type as any === "express") {
            // Can't create express accounts in the real API but this is a useful thing for
            // a mock server to do.  Express accounts are missing these properties.
            delete account.company;
            delete account.individual;
            delete account.tos_acceptance;
        }

        return account;
    }

    export function retrieve(accountId: string, connectedAccountId: string, censoredAccessToken: string): Stripe.Account {
        log.debug("accounts.retrieve", accountId, connectedAccountId);

        if (accountId !== "acct_default" && accountId !== connectedAccountId) {
            throw new RestError(400, {
                message: "The account specified in the path of /v1/accounts/:account does not match the account specified in the Stripe-Account header.",
                type: "invalid_request_error"
            });
        }
        if (!accounts[connectedAccountId]) {
            throw new RestError(403, {
                code: "account_invalid",
                doc_url: "https://stripe.com/docs/error-codes/account-invalid",
                message: `The provided key '${censoredAccessToken}' does not have access to account '${connectedAccountId}' (or that account does not exist). Application access may have been revoked.`,
                type: "invalid_request_error"
            });
        }
        return accounts[connectedAccountId];
    }

    export function list(accountId: string, params: Stripe.PaginationParams): Stripe.ApiList<Stripe.Account> {
        log.debug("accounts.list", accountId, params);

        const data = Object.values(accounts);
        return applyListOptions(data, params, (id, paramName) => retrieve(accountId, id, paramName));
    }

    export function del(accountId: string, connectedAccountId: string, censoredAccessToken: string): Stripe.DeletedAccount {
        log.debug("accounts.delete", accountId, connectedAccountId);

        if (!accounts[connectedAccountId]) {
            throw new RestError(403, {
                code: "account_invalid",
                doc_url: "https://stripe.com/docs/error-codes/account-invalid",
                message: `The provided key '${censoredAccessToken}' does not have access to account '${connectedAccountId}' (or that account does not exist). Application access may have been revoked.`,
                type: "invalid_request_error"
            });
        }

        delete accounts[connectedAccountId];
        return {
            id: connectedAccountId,
            object: "account",
            "deleted": true
        };
    }
}
