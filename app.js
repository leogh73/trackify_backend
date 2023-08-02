import express from 'express';
const app = express();
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv/config';

app.use(compression());
app.setMaxListeners(20);
app.use(express.json());
app.use(cors({ origin: true }));
app.use(express.urlencoded({ extended: false }));
app.use(helmet());

import { router as user } from './src/routes/users_routes.js';
import { router as mercadoLibre } from './src/routes/mercadolibre_routes.js';
import { router as google } from './src/routes/google_routes.js';
import { router as cronJobs } from './src/routes/cron_jobs_routes.js';
// import { router as test } from './src/routes/test_routes.js';

app.use('/api/user', user);
app.use('/api/google', google);
app.use('/api/mercadolibre', mercadoLibre);
app.use('/api/cronjobs', cronJobs);
// app.use('/api/test', test);

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Listening on port ${port}`));
