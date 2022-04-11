const Twitter = require('twitter-lite');
const colors = require('colors');
require('dotenv').config()
const fs = require('fs');
const bigInt = require("big-integer");
//const { resolve } = require('path');
const axios = require('axios').default;

// TODO: should change http.get to axios get

// Make the twitter client
const client = new Twitter({
	subdomain: "api", 
	version: "1.1",
	consumer_key: process.env.CONSUMER_KEY, 
	consumer_secret: process.env.CONSUMER_SECRET, 
	access_token_key: process.env.ACCESS_TOKEN, 
	access_token_secret: process.env.ACCESS_TOKEN_SECRET 
});

// Starting point
async function lets_twitter(last_id) {
	try{
		// Create a variable to hold the last tweet id, since we will resolve it
		var last_tweet_id = bigInt(0);
		
		if(last_id == '0'){
			last_id = null;
		}

		const likes = await get_likes(last_id);
		console.log(`We got ${ likes.length } likes`);

		for(const tweet of likes){
			process.stdout.write("Processing ")

			try{
				const result = process_tweet(tweet);
                console.log('here')

				if(result == 'success'){
					console.log('unliking like'.red);
					destroy_like(tweet.id_str);
				}
			}
            catch(error){
				console.log(`could not process tweet ${tweet.id_str} moving to next`);
				continue;
			}
			
			if(last_tweet_id == 0 || !last_tweet_id.lesser(bigInt(tweet.id_str))){
				last_tweet_id = bigInt(tweet.id_str);
			}
		}

		// TODO: fix the return value if no tweets were returned
		console.log(`last tweet id is: ${ bigInt(last_tweet_id).toString()}`);
		return bigInt(last_tweet_id).toString();
	}
    catch(error){
		return error;
	}
}

// Get a bunch of likes
async function get_likes(last_id) {
	const parameters = {
		screen_name: process.env.TARGET_ACCOUNT,
		count: 50,
		include_entities: true,
		include_ext_alt_text: true,
		tweet_mode: "extended",
		//trim_user: true,
	};

	if (typeof last_id != 'undefined') {
		console.log(`passed last id to get_likes is: ${last_id}`)
		if (last_id != 0) {
			parameters.max_id = bigInt(last_id).minus(1).toString();
			console.log(`Getting tweets before: ${parameters.max_id}`);
		}
	}
	
	try{
		const likes = await client.get("favorites/list", parameters);
		console.log((`Got ${likes.length} results`).green);

		if (likes.length == 0) {
			//console.dir(results, { depth: null });
			console.log("No More Results".bgRed)
		}

		return likes;

	}
    catch(error){
		return error;
	}
}

async function process_tweet(element) {
	console.log((`https://twitter.com/${ element.user.screen_name }/status/${ element.id_str }`).blue.underline)
	
	//if the tweet has extended_entities, meaning, images or videos, go inside.
	if (typeof element.extended_entities !== 'undefined') {
		// loop through media of extended entity
		for(const entity of element.extended_entities.media){
			if (entity.type == "video") {
				console.log("it is a video..".green);
				download_video(entity, element);
			} 
			else if (entity.type == "photo") {
				console.log("it is a photo..".green);
				download_photo(entity, element);
			} 
			else if (entity.type == "animated+gif") {
				console.log("it is a an animated GIF..".green);
				download_video(entity, element);
			} 
			else {
				console.log((`it is a ${entity.type}`).bgRed.white);
				console.log(JSON.stringify(element, null, 4));
			}	
		}
		return 'success';
	}
	else if (typeof element.entities !== "undefined") {
		console.log("seems to be a personal retweet, deal with it later".bgRed.white);
		console.log("Not an extended media tweet");
		//console.log(JSON.stringify(element, null, 4));

		element.entities.urls.forEach(eurl => {
			var our_url = eurl.expanded_url;
			if (our_url.startsWith("https://twitter.com/i/web/status")) {
				our_url = our_url.substring(our_url.lastIndexOf('/') + 1)
				console.log(our_url)

				const parameters = {
					id: our_url,
					include_entities: true,
					//trim_user: true,
					include_ext_alt_text: true,
					tweet_mode: "extended"
				};

				client.get("statuses/show", parameters).then(my_results => {
						//process_tweet(my_result);
						// TODO
						//Doing Nothing with personal
				}).catch(console.error);
			}
		});
		return 'failed';
	}
}

async function download_video(entity, element) {
    try {
        // loop through variants
		var video_url = '';
		var bitrate = '0';
		console.log('working on the download'.green)
		
        // Pick the best bitrate
		entity.video_info.variants.forEach((variant) => {
			if (typeof variant.bitrate !== undefined) {
				if (variant.bitrate >= bitrate) {
					video_url = variant.url;
					bitrate = variant.bitrate;
				}
			}
		});

		//now lets clean the url
		const file_url = video_url.replace("https", "http");

		const dirName = process.env.DOWNLOAD_LOCATION + element.user.screen_name + '/';
		if (!fs.existsSync(dirName)) fs.mkdirSync(dirName);		

		const fileName = dirName + bitrate + "_" + file_url.replace(/^.*[\\\/]/, '').split('?')[0];
        const writer = fs.createWriteStream(fileName);
        const response = await axios.get(file_url, {responseType: 'stream'});

        response.data.pipe(writer);
        console.log('Done Downloading'.green)
    } 
    catch (error) {
        console.error('Failed'.bgRed.white)
        console.error(error.message);
    }

}

async function download_photo(entity, element) {
    try {
        console.log('working on the download'.green)
        var photo_url = entity.media_url;
        const file_url = photo_url.replace("https", "http");
        const dirName = process.env.DOWNLOAD_LOCATION + element.user.screen_name + '/';
        if (!fs.existsSync(dirName)) {
            fs.mkdirSync(dirName);
        }

        const fileName = dirName + file_url.replace(/^.*[\\\/]/, '').split('?')[0];
        const writer = fs.createWriteStream(fileName);
        const response = await axios.get(file_url, {responseType: 'stream'});

        response.data.pipe(writer);
        console.log('Done Downloading'.green)
    } 
    catch (error) {
        console.error('Failed'.bgRed.white)
        console.error(error.message);
    }
}

// unlike
async function destroy_like(id) {
	console.log(('deleteing ' + id).red);
    
	const parameters = { id: id, include_entities: false};

	try{
		await client.post("favorites/destroy", parameters);
		console.log(`Successfully unliked ${id}`.cyan);
	}
    catch(error){
		console.error("failed destroying the like".bgRed.white);
		console.log(error.errors);
	}
}

module.exports.lets_twitter = lets_twitter;