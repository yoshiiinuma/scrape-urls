
import cheerio from 'cheerio';
import ScrapedLinks from './scraped-links.js';

export default function(originalURL, knownLinks = {}, allLinks = [], debug = false) {
  var url = originalURL;
  var known = knownLinks;
  var all = allLinks; 
  var dbg = debug;

  return (html) => {
    let $ = cheerio.load(html);
    let r = new ScrapedLinks(url, known, all, dbg);
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
        r.setResource(l.attr('href'));
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
