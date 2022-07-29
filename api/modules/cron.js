import { CronJob } from 'cron';
import trackings from '../controllers/trackings_controllers.js';

let job = new CronJob('* */2 * * *', trackings.checkCycle);

job.start();

export default job;
