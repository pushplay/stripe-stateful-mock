import express from "express";
import {auth} from "./api/auth";
import {accounts} from "./api/accounts";
import {charges} from "./api/charges";
import {customers} from "./api/customers";
import {disputes} from "./api/disputes";
import {refunds} from "./api/refunds";

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

export function getRequestAccountId(req: express.Request): string {
    const connectAccountId = req.header("stripe-account");
    if (connectAccountId) {
        accounts.retrieve("acct_default", connectAccountId, auth.getCensoredAccessTokenFromRequest(req));
        return connectAccountId;
    }
    return "acct_default";
}

export {routes};
