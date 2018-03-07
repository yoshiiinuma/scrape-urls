
//var rp = require("request-promise");
//var cheerio = require("cheerio");
import rp from 'request-promise';
import cheerio from 'cheerio';
import { URL } from 'url';

const MAX_REQUESTS = 30;

function usage() {
  console.log("USAGE: node index.js <URL> [LIMIT]");
  console.log("");
  console.log("  LIMIT: Max number of total requests (Default " + MAX_REQUESTS + ")");
  console.log("");
}

if (process.argv.length < 3 || process.argv.length > 4) {
  console.log(process.argv);
  console.log(process.argv.length);
  usage();
  process.exit();
}

const original = process.argv[2];
var limit = process.argv[3] || MAX_REQUESTS;
var rootUrl = "";
var cnt = 0;

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
          //return Promise.all(r.links.map(getLinks));
          return r.links.reduce((promise, link) => {
            return promise.then(() => getLinks(link));
          }, Promise.resolve());
        }
        return;
      }
    })
    //.catch(err => console.log(err));
}

getLinks(original)
  .then(() => console.log(allLinks))
  .catch(err => console.log(err));
