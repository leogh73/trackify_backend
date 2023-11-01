import express from 'express';
const app = express();
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv/config';

app.setMaxListeners(20);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors({ origin: true }));
app.use(helmet());
app.use(compression());

import { router as user } from './src/routes/users_routes.js';
import { router as mercadoLibre } from './src/routes/mercado_libre_routes.js';
import { router as googleDrive } from './src/routes/google_drive_routes.js';
import { router as cronJobs } from './src/routes/cron_jobs_routes.js';
// import { router as dev } from './src/routes/dev_routes.js';

app.use('/api/user', user);
app.use('/api/googledrive', googleDrive);
app.use('/api/mercadolibre', mercadoLibre);
app.use('/api/cronjobs', cronJobs);
// app.use('/api/dev', dev);

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Listening on port ${port}`));
