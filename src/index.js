
//var rp = require("request-promise");
//var cheerio = require("cheerio");
import rp from 'request-promise';
import cheerio from 'cheerio';
import { URL } from 'url';

const MAX_REQUESTS = 30;

function usage() {
  console.log("USAGE: npm run exec -- <URL> [OPTION]...");
  console.log("USAGE: node dist/index.js <URL> [OPTION]...");
  console.log("\n  OPTIONS: ");
  console.log("  --async: Run asynchronously");
  console.log("  --limit LIMIT: Specify Max number of total requests (Default " + MAX_REQUESTS + ")");
  console.log("  --visit: Print only visited");
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
var rootUrl;

for (var i = 2; i < process.argv.length; i++) {
  if (process.argv[i] === '--async') {
    async = true;
  }
  if (process.argv[i] === '--limit') {
    if (process.argv[i+1]) {
      limit = Number(process.argv[i+1]);
      i++;
    }
  }
  if (process.argv[i] === '--DEBUG') {
    debug = true;
  }
  if (process.argv[i] === '--visit') {
    onlyVisited = true;
  }
  if (process.argv[i] === '-h' || process.argv[i] === '--help') {
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

const regexHost = new RegExp('^https?://' + rootUrl.host);

var total = 1;
var checked = {};
var visited = {};
var allVisited = [];
var allLinks = [];

function extractLinks(arg) {
  let $ = cheerio.load(arg.html);
  let notVisited = [];
  let externals = [];
  let anchors = [];
  let abs = [];
  let rel = [];

  $('a').each((i, e) => {
    let l = $(e);
    let href = l.attr('href');
    let text = l.text().replace(/[\t\n]/g, '').replace(/^ +/, '').replace(/ +$/, '');

    if (href) {
      if (href.endsWith('/')) {
        href = href.replace(/\/$/, '');
      }
      if (href.startsWith('#')) {
        anchors.push({ href: href, text: text });
      } else if (href.startsWith('/')) {
        rel.push({ href: href, text: text });
        let uri = rootUrl.origin + href;
        if (!checked[uri]) {
          checked[uri] = true;
          let h = { href: uri, id: ++total };
          if (debug) console.log('>>> ' + h.id + ': ' + h.href);
          notVisited.push(h);
          allLinks.push(h);
        }
      } else {
        if (regexHost.test(href)) {
          abs.push({ href: href, text: text });
          if (!checked[href]) {
            checked[href] = true;
            let h = { href: href, id: ++total };
            if (debug) console.log('>>> ' + h.id + ': ' + h.href);
            notVisited.push(h);
            allLinks.push(h);
          }
        } else {
          externals.push({ href: href, text: text });
        }
      }
    }
  })
  return {
    links: notVisited,
    externals: externals,
    absolutes: abs,
    relatives: rel,
    anchors: anchors,
    numOfNotVisited: i
  };
}

function getLinks(uri) {
  if (visited[uri.href]) return Promise.reject({ uri, error: 'Visited URL Given' }); 
  if (uri.id > limit) return;

  checked[uri.href] = true;
  visited[uri.href] = true;
  if (debug) console.log('VISIT: ' + uri.id + ': ' + uri.href);

  return rp(uri.href)
    .then(html => {
      allVisited.push(uri);
      let r = extractLinks({ uri: uri, html: html });
      if (r.links.length > 0) {
        if (async) {
          return Promise.all(r.links.map(getLinks));
        } else {
          return r.links.reduce((promise, link) => {
            return promise.then(() => getLinks(link));
          }, Promise.resolve());
        }
      }
    })
    .catch(err => console.log(err));
}


var startUrl = { href: original, id: 1 };
allLinks.push(startUrl);

getLinks(startUrl)
  .then(() => {
    if (onlyVisited) {
      allVisited.forEach((r) => console.log(r.id + ': ' + r.href));
    } else {
      allLinks.forEach((r) => console.log(r.href));
    }
  })
  .catch(err => console.log(err));

