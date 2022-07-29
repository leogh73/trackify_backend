import { slater } from '@slaterjs/next';
import Models from '../modules/mongodb.js';
import trackings from '../controllers/trackings_controllers.js';

const config = {
	tasks: [
		{
			name: 'helloWorld',
			schedule: '0 */2 * * *', // 7AM GMT
			handler: async (event, success, failure) => {
				try {
					await trackings.checkCycle();
				} catch (err) {
					await Models.storeLog(
						'check cycle',
						`${event} - ${success} - ${failure}`,
						'rejected promises',
						luxon.getDate(),
						luxon.getTime(),
					);
				}
			},
		},
	],
};

export default slater(config);
