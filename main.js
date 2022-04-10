// import { Client } from "twitter-api-sdk"; // should implement later
const cron = require('node-cron');

const {lets_twitter} = require('./models/twitter');

console.log('hello, running first time');
lets_twitter();

cron.schedule('*/10 * * * *', () => {
	console.log('Running Every 10 Minute');
	lets_twitter(undefined);
});