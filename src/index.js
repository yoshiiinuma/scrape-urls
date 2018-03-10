
//var rp = require("request-promise");
//var cheerio = require("cheerio");
import rp from 'request-promise';
import cheerio from 'cheerio';
import { URL } from 'url';

const MAX_REQUESTS = 30;

function usage() {
  console.log("USAGE: npm run exec -- <URL> [--async] [--limit <NUM>]");
  console.log("USAGE: node index.js <URL> [--async] [--limit <NUM>]");
  console.log("");
  console.log("  LIMIT: Max number of total requests (Default " + MAX_REQUESTS + ")");
  console.log("");
}

if (process.argv.length < 3) {
  //console.log(process.argv);
  //console.log(process.argv.length);
  usage();
  process.exit();
}

const original = process.argv[2];
var limit = MAX_REQUESTS;
var async = false;
var rootUrl = "";
var cnt = 0;

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
}

try {
  rootUrl = new URL(original);
} catch (err) {
  console.log('Invalid URL: ' + original);
  usage();
  process.exit();
}

const regexHost = new RegExp('^https?://' + rootUrl.host);

var visited = {};
var visiting = [];
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
        if (!visited[href]) {
          let uri = arg.uri;
          if (uri.endsWith('/')) {
            uri = uri.replace(/\/$/, '') + href;
          } else {
            uri += href;
          }
          notVisited.push(uri);
        }
      } else {
        if (regexHost.test(href)) {
          abs.push({ href: href, text: text });
          if (!visited[href]) {
            notVisited.push(href);
          }
        } else {
          externals.push({ href: href, text: text });
        }
      }
    }
  })
  return { links: notVisited, externals: externals, absolutes: abs, relatives: rel, anchors: anchors};
}

function getLinks(uri) {
  return rp(uri)
    .then(html => {
      if (!visited[uri]) {
        if (cnt > limit) return;
        cnt++;
        console.log(uri);
        visited[uri] = true;
        allLinks.push(uri);
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
        return;
      }
    })
    //.catch(err => console.log(err));
}

getLinks(original)
  .then(() => console.log(allLinks))
  .catch(err => console.log(err));
