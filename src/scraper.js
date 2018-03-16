
import cheerio from 'cheerio';
import ScrapedLinks from './scraped-links.js';

export default (args) => {
  var rootUrl = args.rootUrl;
  var known = {};
  var allLinks = args.allLinks; 
  var debug = args.debug;

  let startUrl = rootUrl.href.replace(/\/$/, '');
  known[startUrl] = true;
  allLinks.push(startUrl);

  var regexLinkType = /(stylesheet|icon|shortcut icon)/;

  return (html) => {
    let $ = cheerio.load(html);
    let r = new ScrapedLinks(rootUrl, known, allLinks, debug);
    let resources = [];
    let scripts = [];
    let images = [];

    $('a').each((i, e) => {
      let l = $(e);
      if (l && l.attr('href')) {
        r.setLink(l.attr('href'));
      }
    })
    $('link').each((i, e) => {
      let l = $(e);
      if (l && l.attr('href')) {
        let rel = l.attr('rel');
        if (regexLinkType.test(rel)) {
          r.setResource(l.attr('href'));
        }
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
  };
};
