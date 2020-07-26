const { argv } = require('yargs');

/** log a message to the console if debug messages are enabled */
function log(msg) {
  if (!argv.s) console.log(msg);
}

/** sleep for a certain number of seconds */
function sleep(seconds) {
  return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

module.exports = {
  log,
  sleep,
};
