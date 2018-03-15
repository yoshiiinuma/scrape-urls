
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

const regexHost = new RegExp('^https?://' + rootUrl.host);
const regexStaticFile = /\.(pdf|jpg|jpeg|gif|png|js|css|ico|xml)(\?[^?]+)?$/i;
var regexSkip = null;
if (skipKeywords.length > 0) {
  regexSkip = new RegExp('(' + skipKeywords.join('|') + ')', 'i');
}

var cntLinks = 1;
var cntVisited = 0;

var checked = {};
var visited = {};
var allVisited = [];
var allLinks = [];     // Hyperlinks
var allAssets = [];    // Static Files: js, css, images

function toAbsolute(link) {
  if (!link) return link;
  if (link.startsWith('http')) return link;
  if (link.startsWith('/')) return rootUrl.origin + link;
  return rootUrl.origin + '/' + link;
}

function scrapeLinks(arg) {
  let $ = cheerio.load(arg.html);
  let r = new ScrapedLinks(arg.host, arg.known, arg.debug);
  let resources = [];
  let scripts = [];
  let images = [];

  $('a').each((i, e) => {
    let l = $(e);
    let href = l.attr('href');
    //let text = l.text().replace(/[\t\n]/g, '').replace(/^ +/, '').replace(/ +$/, '');

    if (href) {
      r.setLink(href);
    }
  })
  $('link').each((i, e) => {
    let l = $(e);
    let href = toAbsolute(l.attr('href'));
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

  if (regexStaticFile.test(uri)) { return; }
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

      let r = scrapeLinks({ host: rootUrl.host, uri: uri, html: html, known: checked, debug: debug });
      let links = r.getInternalLinks();
      if (links.length == 0) return Promise.reject({ uri, name: 'NoNewLinkFound' });
      allLinks.concat(links);
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


function extractLinks(arg) {
  let $ = cheerio.load(arg.html);
  let notVisited = [];
  let externals = [];
  let anchors = [];
  let abs = [];
  let rel = [];
  let links = [];
  let scripts = [];
  let imgs = [];

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
          let h = { href: uri, id: ++cntLinks };
          if (debug) console.log('>>> ' + h.id + ': ' + h.href);
          notVisited.push(h);
          allLinks.push(h);
        }
      } else {
        if (regexHost.test(href)) {
          abs.push({ href: href, text: text });
          if (!checked[href]) {
            checked[href] = true;
            let h = { href: href, id: ++cntLinks };
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
  $('link').each((i, e) => {
    let l = $(e);
    let href = toAbsolute(l.attr('href'));
    if (href && !checked[href]) {
      checked[href] = true;
      let h = { href: href, id: ++cntLinks };
      if (debug) console.log('>>> ' + h.id + ': ' + h.href);
      links.push(h);
      allAssets.push(h);
    }
  })
  $('script').each((i, e) => {
    let l = $(e);
    let href = toAbsolute(l.attr('src'));
    if (href && !checked[href]) {
      checked[href] = true;
      let h = { href: href, id: ++cntLinks };
      if (debug) console.log('>>> ' + h.id + ': ' + h.href);
      scripts.push(h);
      allAssets.push(h);
    }
  })
  $('img').each((i, e) => {
    let l = $(e);
    let href = toAbsolute(l.attr('src'));
    if (href && !checked[href]) {
      checked[href] = true;
      let h = { href: href, id: ++cntLinks };
      if (debug) console.log('>>> ' + h.id + ': ' + h.href);
      imgs.push(h);
      allAssets.push(h);
    }
  })
  return {
    links: notVisited,
    externals: externals,
    absolutes: abs,
    relatives: rel,
    anchors: anchors
  };
}

function getLinks(uri) {
  if (visited[uri.href]) return Promise.reject({ uri, error: 'Visited URL Given' });

  checked[uri.href] = true;
  visited[uri.href] = true;

  if (regexStaticFile.test(uri.href)) { return; }
  if (regexSkip && regexSkip.test(uri.href)) {
    console.log('SKIP: ' + uri.href);
    return;
  }

  cntVisited++;
  if (cntVisited > limit) {
    if (debug) console.log('LIMIT: ' + cntVisited + ' ID: ' + uri.id + ' ' + uri.href);
    return Promise.reject({ uri, name: 'LimitReached'});
  }
  if (debug) console.log('VISIT: ' + uri.id + ': ' + uri.href);

  return rp(uri.href)
    .then(html => {
      allVisited.push(uri);
      if (regexStaticFile.test(uri.href)) { return; }

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
    .catch(err => {
      if (err.statusCode) {
        console.log('ERROR: ' + err.statusCode + ' ' + uri.href);
      } else if (err.name === 'RequestError') {
        console.log(err.message + ': ' + uri.href);
      } else if (err.name === 'LimitReached') {
      } else {
        console.log(err);
        console.log(Object.keys(err));
      }
    });
}


//var startUrl = { href: original, id: 1 };
//allLinks.push(startUrl);

//getLinks(startUrl)
//  .then(() => {
//    if (onlyVisited) {
//      allVisited.forEach((r) => console.log(r.id + ': ' + r.href));
//    } else {
//      allLinks.forEach((r) => console.log(r.href));
//    }
//  })
//  .catch(err => console.log(err));

allLinks.push(original);
checked[original] = true;

crawl(original)
  .then(() => {
    console.log('-----------------------------------------');
    if (onlyVisited) {
      allVisited.forEach((r) => console.log(r));
    } else {
      allLinks.forEach((r) => console.log(r));
    }
  })
  .catch(err => console.log(err));

