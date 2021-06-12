import Stripe from "stripe";
import { AccountData } from "./AccountData";
import { generateId, stringifyMetadata } from "./utils";
import { verify } from "./verify";
import { RestError } from "./RestError";
import log = require("loglevel");

export namespace checkout {
  export namespace sessions {
    const accountCheckoutSessions = new AccountData<Stripe.Checkout.Session>();

    export function create(
      accountId: string,
      params: Stripe.Checkout.SessionCreateParams
    ): Stripe.Checkout.Session {
      log.debug("checkout.session.create", accountId, params);

      verify.requiredParams(params, ["cancel_url"]);
      verify.requiredParams(params, ["payment_method_types"]);
      verify.requiredParams(params, ["success_url"]);

      const sessionId = `cs_${generateId()}`;
      if (accountCheckoutSessions.contains(accountId, sessionId)) {
        throw new RestError(400, {
          code: "resource_already_exists",
          doc_url:
            "https://stripe.com/docs/error-codes/resource-already-exists",
          message: `Checkout session already exists.`,
          type: "invalid_request_error",
        });
      }

      const subtotal = params.line_items?.reduce((acc, item) => {
        const amount =
          item.amount ??
          item.price_data.unit_amount ??
          Number.parseInt(item.price || "0");
        return (acc += amount);
      }, 0);

      const session: Stripe.Checkout.Session = {
        id: sessionId,
        object: "checkout.session",
        amount_subtotal: subtotal,
        amount_total: subtotal,
        allow_promotion_codes: params.allow_promotion_codes ?? true,
        billing_address_collection: params.billing_address_collection ?? null,
        client_reference_id: params.client_reference_id ?? null,
        cancel_url: params.cancel_url,
        customer_email: params.customer_email ?? null,
        customer: {
          id: `cu_${generateId()}`,
          object: "customer",
          email: params.customer_email ?? null,
          name: "Some Customer",
        } as any,
        currency: "gbp",
        mode: params.mode ?? "payment",
        livemode: false,
        line_items: (params.line_items as any) || [],
        locale: params.locale ?? "auto",
        metadata: stringifyMetadata(params.metadata),
        payment_status: "paid",
        payment_method_types: params.payment_method_types,
        payment_intent: null,
        setup_intent: null,
        shipping: null,
        shipping_address_collection: null,
        subscription: null,
        submit_type: params.submit_type ?? "pay",
        success_url: params.success_url,
        total_details: null,
      };

      accountCheckoutSessions.put(accountId, session);
      return session;
    }

    export function retrieve(
      accountId: string,
      checkoutSessionId: string,
      paramName: string
    ): Stripe.Checkout.Session {
      log.debug("checkout.session.retrieve", accountId, checkoutSessionId);

      const session = accountCheckoutSessions.get(accountId, checkoutSessionId);
      if (!session) {
        throw new RestError(404, {
          code: "resource_missing",
          doc_url: "https://stripe.com/docs/error-codes/resource-missing",
          message: `No such checkout session: ${checkoutSessionId}`,
          param: paramName,
          type: "invalid_request_error",
        });
      }
      return session;
    }
  }
}
