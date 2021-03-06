const fs = require('fs-extra');
const puppeteer = require('puppeteer');
const GIFEncoder = require('gif-encoder');
const getPixels = require('get-pixels');
const { argv } = require('yargs');
const { sleep } = require('./helpers.js');
const { postToTwitter } = require('./twitter.js');

const encoder = new GIFEncoder(800, 600);
const workDir = '../temp';
const outDir = '../out';
let firstImage = undefined;
let lastImage = undefined;
let outFile = undefined;
let delay = 0; // number of seconds between screenshots
let screenshots = 10;
let notweet = false;

/** set up the temp and out directories */
async function prepDirectory() {
  console.log(`new working directory ${workDir}`);
  await fs.emptyDir(workDir);
  console.log(`check output directory ${outDir}`);
  await fs.ensureDir(outDir);
}

/** launch a new puppeteer instance and take a screenshot */
async function takeScreenshot(currentScreenshot) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  await page.goto('https://www.google.com/maps/@29.7696912,-95.3576299,11.19z/data=!5m1!1e1');

  // elements that must be visible before we start
  await page.waitForSelector('#omnibox-container');
  await page.waitForSelector('#fineprint-copyrights');

  // elements to hide
  await page.waitForSelector('#vasquette');
  await page.waitForSelector('#minimap');
  await page.waitForSelector('.app-vertical-widget-holder');
  await page.waitForSelector('.app-horizontal-widget-holder');
  await page.waitForSelector('.widget-layer-container');

  await page.evaluate(() => {
    const vasquette = document.querySelector('#vasquette');
    vasquette.parentNode.removeChild(vasquette);
    const minimap = document.querySelector('#minimap');
    minimap.parentNode.removeChild(minimap);
    const verticalWidgets = document.querySelector('.app-vertical-widget-holder');
    verticalWidgets.parentNode.removeChild(verticalWidgets);
    const horizontalWidgets = document.querySelector('.app-horizontal-widget-holder');
    horizontalWidgets.parentNode.removeChild(horizontalWidgets);
    const widgetLayerContainer = document.querySelector('.widget-layer-container');
    widgetLayerContainer.parentNode.removeChild(widgetLayerContainer);
  });

  const now = new Date();
  let options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const date = now.toLocaleDateString('en-US', options);
  const time = now.toLocaleTimeString('en-US');
  const timestamp = now.getTime();

  if (currentScreenshot === 0) firstImage = timestamp;
  else if (currentScreenshot === screenshots - 1) lastImage = timestamp;

  const args = { date, time };
  await page.evaluate(({ date, time }) => {
    let el = document.querySelector('#omnibox-container');
    el.style = 'padding:10px;background-color:white;opacity:0.75;';
    el.innerHTML = `
          <div>${date}</div>
          <div>${time}</div>
        `;
  }, args);

  console.log(`taking screenshot ${currentScreenshot + 1}/${screenshots} -- ${date} ${time} -- ${workDir}/${timestamp}.png`);
  await page.screenshot({ path: `${workDir}/${timestamp}.png` });

  await browser.close();
}

/** add all images in a list to a gif */
function addToGif(images, counter = 0) {
  console.log(`adding image ${counter + 1}/${screenshots}`);
  getPixels(images[counter], async (err, pixels) => {
    encoder.addFrame(pixels.data);
    encoder.read();
    if (counter === images.length - 1) {
      encoder.finish();
      console.log(`gif is done ${outDir}/${outFile}.gif`);

      if (!notweet) {
        await sleep(10); // TODO - if I don't wait, Twitter says filetype is unrecognized... why?
        await postToTwitter(`${outDir}/${outFile}.gif`);
      }

      await fs.remove(workDir);
      console.log(`${workDir} removed`);

      process.exit(0);
    } else {
      addToGif(images, ++counter);
    }
  });
}

/** look at the pngs in the working directory and create a gif */
function createGif() {
  const listOfPNGs = fs.readdirSync(workDir)
    .map(a => a.substr(0, a.length - 4)) // filename without '.png'
    .sort((a, b) => a - b)
    .map(a => `${workDir}/${a.substr(0, a.length)}.png`);

  outFile = `${firstImage}-to-${lastImage}`;
  console.log(`create gif`);
  const stream = fs.createWriteStream(`${outDir}/${outFile}.gif`);

  // configure encoder
  encoder.setFrameRate(60);
  encoder.pipe(stream);
  encoder.setQuality(10);
  encoder.setDelay(500);
  encoder.writeHeader();
  encoder.setRepeat(0);

  addToGif(listOfPNGs);
}

/**
 * main method, entry point for netlify
 * https://docs.netlify.com/functions/build-with-javascript/#format
 */
async function handler(_event, _context, _callback) {
  await prepDirectory();

  for (let i = 0; i < screenshots; i++) {
    await takeScreenshot(i);
    await sleep(delay);
  }

  await createGif();
}

(() => {
  console.log('hello command line user!');
  delay = argv.delay || delay;
  screenshots = argv.screenshots || screenshots;
  notweet = argv.notweet || notweet;
  handler();
})();

exports = {
  handler,
}
