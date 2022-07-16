import { CronJob } from 'cron';
import trackings from '../controllers/trackings_controllers.js';
import user from '../controllers/users_controllers.js';

export let job = new CronJob(
	'0 0 */1 * * *',
	async () => await trackings.checkCycle(await user.checkCycle()),
);
job.start();
