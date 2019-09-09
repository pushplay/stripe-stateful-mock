import express from "express";
import charges from "./api/charges";
import customers from "./api/customers";
import disputes from "./api/disputes";
import paymentIntents from "./api/paymentIntents";

const routes = express.Router();

routes.get("/", (req, res) => {
    return res.status(200).json({
        message: "Hello world",
    });
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
    const refunds = charges.listChargeRefunds(getRequestAccountId(req), req.params.id, req.body);
    return res.status(200).json(refunds);
});

routes.post("/v1/customers", (req, res) => {
    const customer = customers.create(getRequestAccountId(req), req.body);
    return res.status(200).json(customer);
});

routes.get("/v1/customers/:id", (req, res) => {
    const customer = customers.retrieve(getRequestAccountId(req), req.params.id, "id");
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

routes.post("/v1/customers/:customerId/sources", (req, res) => {
    const card = customers.createCard(getRequestAccountId(req), req.params.customerId, req.body);
    return res.status(200).json(card);
});

routes.get("/v1/disputes/:id", (req, res) => {
    const dispute = disputes.retrieve(getRequestAccountId(req), req.params.id, "dispute");
    return res.status(200).json(dispute);
});

routes.get("/v1/payment_intents", (req, res) => {
    const pis = paymentIntents.list(getRequestAccountId(req), req.body);
    return res.status(200).json(pis);
});

routes.get("/v1/payment_intents/:id", (req, res) => {
    const pi = paymentIntents.retrieve(getRequestAccountId(req), req.params.id, "intent");
    return res.status(200).json(pi);
});

routes.post("/v1/payment_intents/:id", (req, res) => {
    const pi = paymentIntents.update(getRequestAccountId(req), req.params.id, req.body);
    return res.status(200).json(pi);
});

routes.post("/v1/payment_intents/:id/confirm", (req, res) => {
    const pi = paymentIntents.confirm(getRequestAccountId(req), req.params.id, req.body);
    return res.status(200).json(pi);
});

routes.post("/v1/payment_intents/:id/capture", (req, res) => {
    const pi = paymentIntents.capture(getRequestAccountId(req), req.params.id, req.body);
    return res.status(200).json(pi);
});

routes.post("/v1/payment_intents/:id/cancel", (req, res) => {
    const pi = paymentIntents.cancel(getRequestAccountId(req), req.params.id, req.body);
    return res.status(200).json(pi);
});

routes.post("/v1/refunds", (req, res) => {
    const refund = charges.createRefund(getRequestAccountId(req), req.body);
    return res.status(200).json(refund);
});

routes.get("/v1/refunds", (req, res) => {
    const refunds = charges.listRefunds(getRequestAccountId(req), req.body);
    return res.status(200).json(refunds);
});

routes.get("/v1/refunds/:id", (req, res) => {
    const refund = charges.retrieveRefund(getRequestAccountId(req), req.params.id, "id");
    return res.status(200).json(refund);
});

export function getRequestAccountId(req: express.Request): string {
    const connectAccountId = req.header("stripe-account");
    if (connectAccountId) {
        return connectAccountId;
    }
    return "acct_default";
}

export {routes};
