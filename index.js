(async () => {
  const fs = require('fs-extra');
  const puppeteer = require('puppeteer');
  const GIFEncoder = require('gif-encoder');
  const getPixels = require('get-pixels');

  const encoder = new GIFEncoder(800, 600);
  const workDir = './temp';
  const outDir = './out';

  let firstImage = undefined;
  let lastImage = undefined;

  async function prepDirectory() {
    console.log(`new working directory ${workDir}`);
    await fs.emptyDir(workDir);
    console.log(`check output directory ${outDir}`);
    await fs.ensureDir(outDir);
  }

  async function takeScreenshots() {
    console.log('start puppeteer');
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    await page.goto('https://www.google.com/maps/@29.7696912,-95.3576299,11.19z/data=!5m1!1e1');
    await page.waitForSelector('#omnibox-container'); // search box

    for (let i = 0; i < 10; i++) {
      const now = new Date();
      var options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
      const date = now.toLocaleDateString('en-US', options);
      const time = now.toLocaleTimeString('en-US');
      const timestamp = now.getTime();

      if (i === 0) firstImage = timestamp;
      else if (i === 9) lastImage = timestamp;

      const args = {date, time};
      await page.evaluate(({date, time}) => {
        let el = document.querySelector('#omnibox-container');
        el.style = 'padding:10px;';
        el.innerHTML = `
          <div>${date}</div>
          <div>${time}</div>
        `;
      }, args);

      console.log(`taking screenshot ${i + 1}/10 -- ${date} ${time} (${timestamp})`);
      await page.screenshot({path: `${workDir}/${timestamp}.png`});
      await page.waitFor(1000);
    }

    console.log('close puppeteer');
    await browser.close();
  }

  function addToGif(images, counter = 0) {
    console.log(`adding image ${counter + 1}/10`);
    getPixels(images[counter], async (err, pixels) => {
      encoder.addFrame(pixels.data);
      encoder.read();
      if (counter === images.length - 1) {
        encoder.finish();
        console.log('done adding images to gif');
        await fs.remove(workDir);
        console.log(`${workDir} removed`);
        process.exit(0);
      } else {
        addToGif(images, ++counter);
      }
    });
  }

  function createGif() {
    const listOfPNGs = fs.readdirSync(workDir)
      .map(a => a.substr(0, a.length - 4)) // filename without '.png'
      .sort((a, b) => a - b)
      .map(a => `${workDir}/${a.substr(0, a.length)}.png`);

    const outFile = `${firstImage}-to-${lastImage}`;
    console.log(`create gif ${outDir}/${outFile}.gif`);
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

  await prepDirectory();
  await takeScreenshots();
  await createGif();
})();
