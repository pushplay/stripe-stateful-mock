import express from "express";
import {auth} from "./api/auth";
import {accounts} from "./api/accounts";
import {charges} from "./api/charges";
import {customers} from "./api/customers";
import {disputes} from "./api/disputes";
import {products} from "./api/products";
import {refunds} from "./api/refunds";
import {subscriptions} from "./api/subscriptions";
import {plans} from "./api/plans";

const routes = express.Router();

routes.get("/", (req, res) => {
    return res.status(200).json({
        message: "Hello world",
    });
});

routes.post("/v1/accounts", (req, res) => {
    const account = accounts.create(getRequestAccountId(req), req.body);
    return res.status(200).json(account);
});

routes.get("/v1/accounts", (req, res) => {
    const accountList = accounts.list(getRequestAccountId(req), req.query);
    return res.status(200).json(accountList);
});

routes.get("/v1/accounts/:id", (req, res) => {
    accounts.retrieve("acct_default", req.params.id, auth.getCensoredAccessTokenFromRequest(req));
    const account = accounts.retrieve(getRequestAccountId(req), req.params.id, auth.getCensoredAccessTokenFromRequest(req));
    return res.status(200).json(account);
});

routes.delete("/v1/accounts/:id", (req, res) => {
    accounts.retrieve("acct_default", req.params.id, auth.getCensoredAccessTokenFromRequest(req));
    const account = accounts.del(getRequestAccountId(req), req.params.id);
    return res.status(200).json(account);
});

routes.get("/v1/charges", (req, res) => {
    const chargeList = charges.list(getRequestAccountId(req), req.query);
    return res.status(200).json(chargeList);
});

routes.post("/v1/charges", (req, res) => {
    const charge = charges.create(getRequestAccountId(req), req.body);
    return res.status(200).json(charge);
});

routes.get("/v1/charges/:id", (req, res) => {
    const charge = charges.retrieve(getRequestAccountId(req), req.params.id, "id");
    return res.status(200).json(charge);
});

routes.post("/v1/charges/:id", (req, res) => {
    const charge = charges.update(getRequestAccountId(req), req.params.id, req.body);
    return res.status(200).json(charge);
});

routes.post("/v1/charges/:id/capture", (req, res) => {
    const charge = charges.capture(getRequestAccountId(req), req.params.id, req.body);
    return res.status(200).json(charge);
});

// Old API.
routes.get("/v1/charges/:id/refunds", (req, res) => {
    const refundList = refunds.list(getRequestAccountId(req), {...req.query, charge: req.params.id});
    return res.status(200).json(refundList);
});

routes.post("/v1/customers", (req, res) => {
    const customer = customers.create(getRequestAccountId(req), req.body);
    return res.status(200).json(customer);
});

routes.get("/v1/customers", (req, res) => {
    const customerList = customers.list(getRequestAccountId(req), req.query);
    return res.status(200).json(customerList);
});

routes.get("/v1/customers/:id", (req, res) => {
    const customer = customers.retrieve(getRequestAccountId(req), req.params.id, "id");
    return res.status(200).json(customer);
});

routes.post("/v1/customers/:id", (req, res) => {
    const customer = customers.update(getRequestAccountId(req), req.params.id, req.body);
    return res.status(200).json(customer);
});

routes.post("/v1/subscriptions", (req, res) => {
    const subscription = subscriptions.create(getRequestAccountId(req), req.body);
    return res.status(200).json(subscription);
});

routes.get("/v1/subscriptions", (req, res) => {
    const subscriptionList = subscriptions.list(getRequestAccountId(req), req.query);
    return res.status(200).json(subscriptionList);
});

routes.get("/v1/subscriptions/:id", (req, res) => {
    const subscription = subscriptions.retrieve(getRequestAccountId(req), req.params.id, "id");
    return res.status(200).json(subscription);
});

// TODO: routes.post("/v1/subscriptions/:id")

routes.get("/v1/subscription_items", (req, res) => {
    const subscriptionItemList = subscriptions.listItem(getRequestAccountId(req), req.query);
    return res.status(200).json(subscriptionItemList);
});

routes.get("/v1/subscription_items/:id", (req, res) => {
    const subscriptionItem = subscriptions.retrieveItem(getRequestAccountId(req), req.params.id, "id");
    return res.status(200).json(subscriptionItem);
});

routes.post("/v1/subscription_items/:id", (req, res) => {
    const subscriptionItem = subscriptions.updateItem(getRequestAccountId(req), req.params.id, req.body);
    return res.status(200).json(subscriptionItem);
});

// Old API.
routes.get("/v1/customers/:customerId/cards/:cardId", (req, res) => {
    const card = customers.retrieveCard(getRequestAccountId(req), req.params.customerId, req.params.cardId, "card");
    return res.status(200).json(card);
});

// New API.
routes.get("/v1/customers/:customerId/sources/:cardId", (req, res) => {
    const card = customers.retrieveCard(getRequestAccountId(req), req.params.customerId, req.params.cardId, "card");
    return res.status(200).json(card);
});

routes.delete("/v1/customers/:customerId/sources/:cardId", (req, res) => {
    const customer = customers.deleteCard(getRequestAccountId(req), req.params.customerId, req.params.cardId);
    return res.status(200).json(customer);
});

routes.post("/v1/customers/:customerId/sources", (req, res) => {
    const card = customers.createCard(getRequestAccountId(req), req.params.customerId, req.body);
    return res.status(200).json(card);
});

routes.get("/v1/disputes/:id", (req, res) => {
    const dispute = disputes.retrieve(getRequestAccountId(req), req.params.id, "dispute");
    return res.status(200).json(dispute);
});

routes.post("/v1/plans", (req, res) => {
    const plan = plans.create(getRequestAccountId(req), req.body);
    return res.status(200).json(plan);
});

routes.get("/v1/plans", (req, res) => {
    const planList = plans.list(getRequestAccountId(req), req.query);
    return res.status(200).json(planList);
});

routes.get("/v1/plans/:id", (req, res) => {
    const plan = plans.retrieve(getRequestAccountId(req), req.params.id, "id");
    return res.status(200).json(plan);
});

routes.post("/v1/products", (req, res) => {
    const product = products.create(getRequestAccountId(req), req.body);
    return res.status(200).json(product);
});

routes.get("/v1/products", (req, res) => {
    const productList = products.list(getRequestAccountId(req), req.query);
    return res.status(200).json(productList);
});

routes.get("/v1/products/:id", (req, res) => {
    const product = products.retrieve(getRequestAccountId(req), req.params.id, "id");
    return res.status(200).json(product);
});

routes.post("/v1/refunds", (req, res) => {
    const refund = refunds.create(getRequestAccountId(req), req.body);
    return res.status(200).json(refund);
});

routes.get("/v1/refunds", (req, res) => {
    const refundList = refunds.list(getRequestAccountId(req), req.query);
    return res.status(200).json(refundList);
});

routes.get("/v1/refunds/:id", (req, res) => {
    const refund = refunds.retrieve(getRequestAccountId(req), req.params.id, "id");
    return res.status(200).json(refund);
});

routes.all("*", (req, res) => {
    return res.status(404).json({
        error: {
            type: "invalid_request_error",
            message: `No matching path: ${req.path}`
        }
    });
});

export function getRequestAccountId(req: express.Request): string {
    const connectAccountId = req.header("stripe-account");
    if (connectAccountId) {
        accounts.retrieve("acct_default", connectAccountId, auth.getCensoredAccessTokenFromRequest(req));
        return connectAccountId;
    }
    return "acct_default";
}

export {routes};
