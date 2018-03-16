
import cheerio from 'cheerio';
import ScrapedLinks from './scraped-links.js';

export default (args) => {
  const regexLinkType = /(stylesheet|icon|shortcut icon)/;
  var rootUrl = args.rootUrl;
  var known = {};
  var allFound = args.allFound; 
  var debug = args.debug;

  let startUrl = rootUrl.href.replace(/\/$/, '');
  known[startUrl] = true;
  allFound.push(startUrl);

  return (html, url) => {
    let $ = cheerio.load(html);
    let r = new ScrapedLinks(rootUrl, known, allFound, debug);
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
