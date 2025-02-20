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
import { router as googleDrive } from './src/routes/google_drive_routes.js';
import { router as mercadoLibre } from './src/routes/mercado_libre_routes.js';
import { router as mercadoPago } from './src/routes/mercado_pago_routes.js';
import { router as cronJobs } from './src/routes/cron_jobs_routes.js';

app.use('/api/user', user);
app.use('/api/googledrive', googleDrive);
app.use('/api/mercadolibre', mercadoLibre);
app.use('/api/mercadopago', mercadoPago);
app.use('/api/cronjobs', cronJobs);

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Listening on port ${port}`));
