
import rp from 'request-promise';
import { URL } from 'url';

import scraper from './scraper.js';

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

var original = process.argv[2].replace(/\/$/, '');
var limit = MAX_REQUESTS;
var async = false;
var debug = false;
var onlyVisited = false;
var skipKeywords = [];
var rootUrl;

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
  rootUrl = new URL(original);
} catch (err) {
  console.log('Invalid URL: ' + original);
  usage();
  process.exit();
}

const regexStaticFile = /\.(pdf|jpg|jpeg|gif|png|js|css|ico|xml)(\?[^?]+)?$/i;
var regexSkip = null;
if (skipKeywords.length > 0) {
  regexSkip = new RegExp('(' + skipKeywords.join('|') + ')', 'i');
}

var cntVisited = 0;
var visited = {};
var known = {};
var allVisited = [];
var allLinks = [];

allLinks.push(original);
known[original] = true;

var scrapeLinks = scraper(rootUrl, known, allLinks, debug);

function crawl(uri) {
  if (!uri) return Promise.reject({ uri, error: 'No URL Given' });
  if (visited[uri]) return Promise.reject({ uri, error: 'Visited URL Given' });

  visited[uri] = true;

  if (regexStaticFile.test(uri)) {
    if (debug) console.log('STATIC: ' + uri);
    return;
  }
  if (regexSkip && regexSkip.test(uri)) {
    console.log('SKIP: ' + uri);
    return;
  }

  cntVisited++;
  if (cntVisited > limit) {
    return Promise.reject({ uri, name: 'LimitReached' });
  }
  if (debug) console.log('VISIT: ' + cntVisited + ' ' + uri);

  return rp(uri)
    .then(html => {
      allVisited.push(uri);
      if (regexStaticFile.test(uri)) { return Promise.reject({ uri, name: 'SkipStatic' }); }

      let r = scrapeLinks(html);
      let links = r.getInternalLinks();
      if (links.length == 0) return Promise.reject({ uri, name: 'NoNewLinkFound' });

      if (async) {
        return Promise.all(links.map(crawl));
      } else {
        return links.reduce((promise, link) => {
          return promise.then(() => crawl(link));
        }, Promise.resolve());
      }
    })
    .catch(err => {
      if (err.statusCode) {
        console.log('ERROR: ' + err.statusCode + ' ' + uri);
      } else if (err.name === 'RequestError') {
        console.log(err.message + ': ' + uri);
      } else if (err.name === 'LimitReached') {
        if (debug) console.log('LIMIT: ' + cntVisited + ' ' + err.uri);
      } else if (err.name === 'SkipStatic') {
        if (debug) console.log('STATIC: ' + cntVisited + ' ' + err.uri);
      } else if (err.name === 'NoNewLinkFound') {
        if (debug) console.log('DONE: ' + cntVisited + ' ' + err.uri);
      } else {
        console.log(err);
        console.log(Object.keys(err));
      }
    });
}

crawl(original)
  .then(() => {
    if (onlyVisited) {
      allVisited.forEach((r) => console.log(r));
    } else {
      allLinks.forEach((r) => console.log(r));
    }
  })
  .catch(err => console.log(err));

