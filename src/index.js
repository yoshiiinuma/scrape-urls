
import rp from 'request-promise';
import { URL } from 'url';

import scraper from './scraper.js';
import crawler from './crawler.js';

const MAX_REQUESTS = 30;

function usage() {
  console.log("USAGE: npm run exec -- <URL> [OPTION]...");
  console.log("USAGE: node dist/index.js <URL> [OPTION]...");
  console.log("\n  OPTIONS: ");
  console.log("  --async: Run asynchronously");
  console.log("  --limit LIMIT: Specify Max number of total requests (Default " + MAX_REQUESTS + ")");
  console.log("  --visit: Print only visited");
  console.log("  --skip KEYWORD: Skip links that containing the given KEYWORD; you can use --skip multiple times");
  console.log("  --DEBUG: Print debug messages");
  console.log("  -h or --help: Print this usage");
  console.log("");
}

if (process.argv.length < 3) {
  usage();
  process.exit();
}

//var original = process.argv[2].replace(/\/$/, '');
var original = process.argv[2];
var limit = MAX_REQUESTS;
var async = false;
var debug = false;
var onlyVisited = false;
var skipKeywords = [];
var baseUrl;

for (var i = 2; i < process.argv.length; i++) {
  let arg = process.argv[i];
  if (arg === '--async') {
    async = true;
  }
  if (arg === '--limit') {
    if (process.argv[i+1]) {
      limit = Number(process.argv[i+1]);
      i++;
    }
  }
  if (arg === '--skip') {
    if (process.argv[i+1]) {
      let word = process.argv[i+1];
      skipKeywords.push(word);
      i++;
    }
  }
  if (arg === '--DEBUG') {
    debug = true;
  }
  if (arg === '--visit') {
    onlyVisited = true;
  }
  if (arg === '-h' || arg === '--help') {
    usage();
    process.exit();
  }
}

try {
  baseUrl = new URL(original);
} catch (err) {
  console.log('Invalid URL: ' + original);
  usage();
  process.exit();
}

var allVisited = [];
var allFound = [];

var scrapeLinks = scraper({ baseUrl, allFound, debug });

var crawl = crawler({ all: allVisited, getLinks: scrapeLinks, limit, async, skipKeywords, debug });

crawl(original)
  .then(() => {
    if (onlyVisited) {
      allVisited.forEach((r) => console.log(r));
    } else {
      allFound.forEach((r) => console.log(r));
    }
  })
  .catch(err => console.log(err));

