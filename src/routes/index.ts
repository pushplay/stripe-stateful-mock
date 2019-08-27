import { Router } from 'express';
import charges from "../api/charges";
import customers from "../api/customers";

const routes = Router();

routes.get('/', (req, res) => {
    return res.status(200).json({
        message: "Hello world",
    });
});

routes.post('/v1/charges', (req, res) => {
    const charge = charges.create(req.body);
    return res.status(200).json(charge);
});

routes.get('/v1/charges/:id', (req, res) => {
    const charge = charges.retrieve(req.params.id, "id");
    return res.status(200).json(charge);
});

routes.post('/v1/charges/:id', (req, res) => {
    const charge = charges.update(req.params.id, req.body);
    return res.status(200).json(charge);
});

routes.post('/v1/charges/:id/capture', (req, res) => {
    const charge = charges.capture(req.params.id, req.body);
    return res.status(200).json(charge);
});

routes.post('/v1/customers', (req, res) => {
    const customer = customers.create(req.body);
    return res.status(200).json(customer);
});

routes.get('/v1/customers/:id', (req, res) => {
    const customer = customers.retrieve(req.params.id, "id");
    return res.status(200).json(customer);
});

routes.get('/v1/customers/:customerId/cards/:cardId', (req, res) => {
    const card = customers.retrieveCard(req.params.customerId, req.params.cardId);
    return res.status(200).json(card);
});

routes.post('/v1/refunds', (req, res) => {
    const refund = charges.createRefund(req.body);
    return res.status(200).json(refund);
});

routes.get('/v1/refunds/:id', (req, res) => {
    const refund = charges.retrieveRefund(req.params.id, "id");
    return res.status(200).json(refund);
});

export {routes};
