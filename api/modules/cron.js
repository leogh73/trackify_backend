import { CronJob } from 'cron';
import trackings from '../controllers/trackings_controllers.js';

export let job = new CronJob('0 0 */2 * * *', async () => await trackings.checkCycle());

job.start();
