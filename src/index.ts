import express from 'express';
import bodyParser from 'body-parser';
import expressBasicAuth from 'express-basic-auth';
import {routes} from './routes';

const port = process.env.PORT || 8000;

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(expressBasicAuth({
    authorizer: (username: string, password: string) => /^sk_test_/.test(username),
    unauthorizedResponse: (req: express.Request) => ({
        error: {
            message: "Invalid API Key provided: *************************",
            type: "invalid_request_error"
        }
    })
}));
app.use('/', routes);
app.listen(+port, () => {
    console.log(`Server started on port ${port}`);
});
export {app};
