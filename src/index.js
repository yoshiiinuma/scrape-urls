
//var rp = require("request-promise");
//var cheerio = require("cheerio");
import rp from 'request-promise';
import cheerio from 'cheerio';
import { URL } from 'url';

var ScrapedLinks = require('./scraped-links.js');

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

var checked = {};
var visited = {};
var allVisited = [];
var allLinks = [];     // Hyperlinks

function scrapeLinks(arg) {
  let $ = cheerio.load(arg.html);
  let r = new ScrapedLinks(arg.url, arg.known, arg.callback, arg.debug);
  let resources = [];
  let scripts = [];
  let images = [];

  $('a').each((i, e) => {
    let l = $(e);
    if (l && l.attr('href')) {
      r.setLink(l.attr('href');
    }
  })
  $('link').each((i, e) => {
    let l = $(e);
    if (l && l.attr('href')) {
      r.setResource(href);
    }
  })
  $('script').each((i, e) => {
    let l = $(e);
    if (l && l.attr('src')) {
      r.setScript(l.attr('src'));
    }
  })
  $('img').each((i, e) => {
    let l = $(e);
    if (l && l.attr('src')) {
      r.setImage(l.attr('src'));
    }
  })
  return r;
}

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
  if (debug) console.log('VISIT: ' + uri);

  return rp(uri)
    .then(html => {
      allVisited.push(uri);
      return html;
    })
    .then(html => {
      if (regexStaticFile.test(uri)) { return Promise.reject({ uri, name: 'SkipStatic' }); }

      let r = scrapeLinks({
        url: rootUrl,
        html: html,
        known: checked,
        debug: debug,
        callback: (link) => {
          allLinks.push(link)
        }
      });
      let links = r.getInternalLinks();
      if (links.length == 0) return Promise.reject({ uri, name: 'NoNewLinkFound' });
      return links;
    })
    .then(links => {
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

allLinks.push(original);
checked[original] = true;

crawl(original)
  .then(() => {
    if (onlyVisited) {
      allVisited.forEach((r) => console.log(r));
    } else {
      allLinks.forEach((r) => console.log(r));
    }
  })
  .catch(err => console.log(err));

