import { DateTime } from 'luxon';

const dateToday = () => DateTime.now().setZone('America/Buenos_Aires');

export const dateAndTime = () => {
	const { year, month, day, hour, minute, second } = dateToday().c;
	const date = `${day.toString().padStart(2, 0)}/${month.toString().padStart(2, 0)}/${year}`;
	const time = `${hour.toString().padStart(2, 0)}:${minute.toString().padStart(2, 0)}:${second
		.toString()
		.padStart(2, 0)}`;
	return { date, time };
};
