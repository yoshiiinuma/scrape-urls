
//var rp = require("request-promise");
//var cheerio = require("cheerio");
import rp from 'request-promise';
import cheerio from 'cheerio';
import { URL } from 'url';

function usage() {
  console.log("USAGE: node index.js <URL>");
  console.log("");
}

if (process.argv.length !== 3) {
  usage();
  process.exit();
}

const original = process.argv[2];
var rootUrl = "";
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
      if (href.startsWith('#')) {
        anchors.push({ href: href, text: text });
      } else if (href.startsWith('/')) {
        rel.push({ href: href, text: text });
      } else {
        if (regexHost.test(href)) {
          abs.push({ href: href, text: text });
          if (!visited[href]) {
            visited[href] = true;
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
      console.log(uri);
      visited[uri] = true;
      allLinks.push(uri);
      let r = extractLinks({ uri: uri, html: html });
      if (r.links.length > 0) {
        return Promise.all(r.links.map(getLinks));
      }

    })
    .catch(err => console.log(err));
}

getLinks(original)
  .then(() => console.log(allLinks))
  .catch(err => console.log(err));
