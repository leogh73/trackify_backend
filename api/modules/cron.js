import { CronJob } from 'cron';
import trackings from '../controllers/trackings_controllers.js';
import Models from '../modules/mongodb.js';

export let job = new CronJob(
	'0 */30 * * * *',
	async () => await trackings.checkCycle(),
	async () =>
		await Models.storeLog({
			actionName: 'check cycle',
			actionDetail: 'cycle completed',
			errorMessage: '-',
			date: luxon.getDate(),
			time: luxon.getTime(),
		}),
);

job.start();
