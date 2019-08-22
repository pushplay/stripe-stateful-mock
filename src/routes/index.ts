import { Router } from 'express';
import charges from "../api/charges";

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
    const charge = charges.retrieve(req.params.id);
    return res.status(200).json(charge);
});

export {routes};
