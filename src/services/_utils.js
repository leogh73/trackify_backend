const dateStringHandler = (ts) => {
	let timestamp = new Date(ts);
	let date = `${timestamp.getDate().toString().padStart(2, 0)}/${(timestamp.getMonth() + 1)
		.toString()
		.padStart(2, 0)}/${timestamp.getFullYear()}`;
	let time = `${timestamp.getHours().toString().padStart(2, 0)}:${timestamp
		.getMinutes()
		.toString()
		.padStart(2, 0)}:${timestamp.getSeconds().toString().padStart(2, 0)}`;
	return { date, time };
};

const sortEventsByDate = (list) => {
	let eventsList = list.map((e) => {
		let splittedDate = e.time.split('/');
		let splittedTime = e.date.split(':');
		return {
			...e,
			dateObject: Date(
				splittedDate[2],
				splittedDate[1] - 1,
				splittedDate[0],
				splittedTime[0],
				splittedTime[1],
				splittedTime[2] ?? '00',
			),
		};
	});
	eventsList.sort((e1, e2) => e2.dateObject - e1.dateObject);
	return eventsList.map((e) => {
		delete e.dateObject;
		return e;
	});
};

const capitalizeText = (firstWordOnly, text) => {
	return text
		.toLowerCase()
		.split(' ')
		.map((word, index) =>
			firstWordOnly
				? !index
					? word.charAt(0).toUpperCase() + word.slice(1)
					: word
				: word.charAt(0).toUpperCase() + word.slice(1),
		)
		.join(' ');
};

const convert12to24Hour = (time12h) => {
	let [time, period] = time12h.toLowerCase().split(' ');
	let [hours, minutes, seconds] = time.split(':');
	if (period === 'pm' && hours !== '12') {
		hours = parseInt(hours, 10) + 12;
	} else if (period === 'am' && hours === '12') {
		hours = '00';
	}
	hours = String(hours).padStart(2, '0');
	return `${hours}:${minutes}:${seconds ?? '00'}`;
};

const convertNamedDate = (dateNamedMonth, language) => {
	let [month, day, year] = dateNamedMonth.split(' ');
	let monthNumber = getMonthNumber[language][month.split(', ')[0].toLowerCase()];
	return `${day.split(', ')[0]}/${monthNumber}/${year.split(', ')[0]}`;
};

const convertMonthToNumber = (language, month) => {
	let selectedObject = getMonthNumber[language];
	let selectedMonth = Object.keys(selectedObject).filter((m) => m.startsWith(month.toLowerCase()));
	return selectedObject[selectedMonth];
};

const getMonthNumber = {
	spanish: {
		enero: '01',
		febrero: '02',
		marzo: '03',
		abril: '04',
		mayo: '05',
		junio: '06',
		julio: '07',
		agosto: '08',
		septiembre: '09',
		setiembre: '09',
		octubre: '10',
		noviembre: '11',
		diciembre: '12',
	},
	english: {
		january: '01',
		february: '02',
		march: '03',
		april: '04',
		may: '05',
		june: '06',
		july: '07',
		august: '08',
		september: '09',
		october: '10',
		november: '11',
		december: '12',
	},
};

export default {
	dateStringHandler,
	sortEventsByDate,
	capitalizeText,
	convert12to24Hour,
	convertNamedDate,
	convertMonthToNumber,
	getMonthNumber,
};
