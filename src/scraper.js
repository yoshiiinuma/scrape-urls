
import cheerio from 'cheerio';
import ScrapedLinks from './scraped-links.js';

export default (args) => {
  const regexLinkType = /(stylesheet|icon|shortcut icon)/;
  var baseUrl = args.baseUrl;
  var known = {};
  var allFound = args.allFound;
  var debug = ('debug' in args) ? args.debug : false;
  var noQueries = ('noQueries' in args) ? args.noQueries : false;

  let startUrl = baseUrl.href;
  known[startUrl] = true;
  allFound.push(startUrl);

  return (html, url) => {
    let $ = cheerio.load(html);
    let r = new ScrapedLinks({ baseUrl, known, allFound, noQueries, debug });
    let resources = [];
    let scripts = [];
    let images = [];

    $('a').each((i, e) => {
      let l = $(e);
      if (l && l.attr('href')) {
        r.setLink(l.attr('href'), url);
      }
    })
    $('link').each((i, e) => {
      let l = $(e);
      if (l && l.attr('href')) {
        let rel = l.attr('rel');
        if (regexLinkType.test(rel)) {
          r.setResource(l.attr('href'), url);
        }
      }
    })
    $('script').each((i, e) => {
      let l = $(e);
      if (l && l.attr('src')) {
        r.setScript(l.attr('src'), url);
      }
    })
    $('img').each((i, e) => {
      let l = $(e);
      if (l && l.attr('src')) {
        r.setImage(l.attr('src'), url);
      }
    })
    return r;
  };
};
