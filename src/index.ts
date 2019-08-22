import express from 'express';
import bodyParser from 'body-parser';
import {routes} from './routes';

const port = process.env.PORT || 8000;

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/', routes);
app.listen(+port, () => {
    console.log(`Server started on port ${port}`);
});
export {app};
