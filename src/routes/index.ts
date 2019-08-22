import { Router } from 'express';

const routes = Router();

routes.get('/', (req, res) => {
    return res.status(200).json({
        message: "Hello world",
    });
});

routes.post('/v1/charges', (req, res) => {
    console.log("user=", (req as any).user);
    return res.status(200).json({
        message: "Hello world",
    });
});

export {routes};
