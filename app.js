import express from 'express';
const app = express();
import dotenv from 'dotenv/config';

import { router as user } from './api/routes/users_routes.js';
import { router as mercadoLibre } from './api/routes/mercadolibre_routes.js';
import { router as google } from './api/routes/google_routes.js';
import cors from 'cors';
import helmet from 'helmet';
import { job } from './api/modules/cron.js';
// const compression = require('compression');
app.setMaxListeners(20);
app.use(express.json());
app.use(cors({ origin: true }));
app.use(express.urlencoded({ extended: false }));
app.use(helmet());

app.use('/api/user', user);
app.use('/api/google', google);
app.use('/api/mercadolibre', mercadoLibre);

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Listening on port ${port}`));
