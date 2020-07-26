(async () => {
  const fs = require('fs-extra');
  const puppeteer = require('puppeteer');
  const GIFEncoder = require('gif-encoder');
  const getPixels = require('get-pixels');
  const { argv } = require('yargs')

  const encoder = new GIFEncoder(800, 600);
  const workDir = './temp';
  const outDir = './out';

  let firstImage = undefined;
  let lastImage = undefined;

  const { d: DEBUG, delay = 0, screenshots = 10 } = argv;

  main();

  // ------------------------------------------------------

  /** log a message to the console if debug messages are enabled */
  function log(msg) {
    if (DEBUG) console.log(msg);
  }

  /** sleep (blocking) for a certain number of seconds */
  function sleep(seconds) {
    return new Promise(resolve => setTimeout(resolve, seconds * 1000));
  }

  /** set up the temp and out directories */
  async function prepDirectory() {
    log(`new working directory ${workDir}`);
    await fs.emptyDir(workDir);
    log(`check output directory ${outDir}`);
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
    let options = {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'};
    const date = now.toLocaleDateString('en-US', options);
    const time = now.toLocaleTimeString('en-US');
    const timestamp = now.getTime();

    if (currentScreenshot === 0) firstImage = timestamp;
    else if (currentScreenshot === screenshots - 1) lastImage = timestamp;

    const args = {date, time};
    await page.evaluate(({date, time}) => {
      let el = document.querySelector('#omnibox-container');
      el.style = 'padding:10px;background-color:white;opacity:0.75;';
      el.innerHTML = `
          <div>${date}</div>
          <div>${time}</div>
        `;
    }, args);

    log(`taking screenshot ${currentScreenshot + 1}/${screenshots} -- ${date} ${time} (${timestamp})`);
    await page.screenshot({path: `${workDir}/${timestamp}.png`});

    await browser.close();
  }

  /** add all images in a list to a gif */
  function addToGif(images, counter = 0) {
    log(`adding image ${counter + 1}/${screenshots}`);
    getPixels(images[counter], async (err, pixels) => {
      encoder.addFrame(pixels.data);
      encoder.read();
      if (counter === images.length - 1) {
        encoder.finish();
        log('done adding images');
        await fs.remove(workDir);
        log(`${workDir} removed`);
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

    const outFile = `${firstImage}-to-${lastImage}`;
    log(`create gif ${outDir}/${outFile}.gif`);
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

  /** main method, where the magic begins! */
  async function main() {
    await prepDirectory();

    for (let i = 0; i < screenshots; i++) {
      await takeScreenshot(i);
      await sleep(delay);
    }

    await createGif();
  }
})();
