import express from 'express';
import bodyParser from 'body-parser';
import expressBasicAuth from 'express-basic-auth';
import {routes} from './routes';
import StripeError from "./api/StripeError";

const port = process.env.PORT || 8000;

const app = express();

// Body handling before routes.
app.use(bodyParser.urlencoded({ extended: true }));

// Auth handling before routes.
app.use(expressBasicAuth({
    authorizer: (username: string, password: string) => /^sk_test_/.test(username),
    unauthorizedResponse: (req: express.Request) => ({
        error: {
            message: "Invalid API Key provided: *************************",
            type: "invalid_request_error"
        }
    })
}));

// Routes.
app.use('/', routes);

// Error handling comes last.
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.log("error handler called");
    if (err instanceof StripeError) {
        res.status(err.statusCode).send({error: err.error});
        return;
    }

    console.error(err.stack);
    res.status(500).send({
        message: "Unexpected error: " + err.message,
        stack: err.stack
    });
});

app.listen(+port, () => {
    console.log(`Server started on port ${port}`);
});

export {app};
