### What is This?

A node script that creates timelapse gifs of Houston traffic using Puppeteer then posts to Twitter.

https://twitter.com/HtxTrafficGifs

### Getting Started

```
yarn install
node src/index.js
```

Arguments, all optional:

`--screenshots=30` number of screenshots that will be taken (default = 10)

`--delay=5` there is a built-in 3s delay between screenshots, this arg adds more seconds to the delay (default = 0)

`--notweet` skip posting to Twitter

### Resources
https://github.com/aimerib/puppeteer-gif-cast

https://github.com/ruphaa/twitter-bot

https://github.com/netlify/netlify-lambda
