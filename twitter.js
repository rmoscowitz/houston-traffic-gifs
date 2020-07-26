require('dotenv').config();
const {log} = require('./helpers.js');
const fs = require('fs');
const Twitter = require('twitter');

function postToTwitter(fileName) {
  return new Promise((resolve, reject) => {
    if (!fileName) {
      log('fileName required');
      reject();
    }

    const client = new Twitter({
      consumer_key: process.env.TWITTER_CONSUMER_KEY,
      consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
      access_token_key: process.env.TWITTER_ACCESS_TOKEN_KEY,
      access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET
    });

    const data = fs.readFileSync(fileName);

    // upload media to Twitter
    client.post('media/upload', {media: data}, (error, media, _response) => {
      log(`media ${JSON.stringify(media)}`);

      if (!error && media.media_id_string) {
        const [start, _end] = fileName.match(/([0-9])+/g);
        const startDate = new Date(+start);
        let options = {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'};
        const formattedDate = startDate.toLocaleDateString('en-US', options);

        // tweet with media included
        const status = {
          status: `How's the traffic today, ${formattedDate}?`,
          media_ids: media.media_id_string,
        }

        client.post('statuses/update', status, (error, tweet, _response) => {
          if (!error) {
            log(`success posting tweet ${JSON.stringify(tweet)}`);
            resolve();
          } else {
            log(`error posting tweet ${JSON.stringify(error)}`);
            reject();
          }
        });
      } else {
        log(`error uploading gif ${JSON.stringify(error)}`);
        reject();
      }
    });
  });
}

module.exports = {
  postToTwitter,
};
