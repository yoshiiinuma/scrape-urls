
import rp from 'request-promise';

/**
 * Arguments:
 *
 *   all: array to keep track of links that were extracted from visited pages
 *   getLinks: function to extract links from a page
 *   limit: the max number of pages to visit
 *   async: run asynchronously if true
 *   skipKeywords: array of strings that filters links that you don't want to visit
 *
 */
export default (args) => {
  var limit = args.limit || 30;
  var async = args.async || false;
  var allVisited = args.all;
  var getLinks = args.getLinks;
  var debug = args.debug;
  var skipKeywords = args.skipKeywords;

  const regexStaticFile = /\.(pdf|jpg|jpeg|gif|png|js|css|ico|xml)(\?[^?]+)?$/i;
  var regexSkip = null;
  if (skipKeywords && skipKeywords.length > 0) {
    regexSkip = new RegExp('(' + skipKeywords.join('|') + ')', 'i');
  }

  var cntVisited = 0;
  var visited = {};

  const crawl = (uri) => {
    if (!uri) return Promise.reject({ uri, error: 'No URL Given' });
    //if (visited[uri]) return Promise.reject({ uri, error: 'Visited URL Given' });
    if (visited[uri]) return;

    visited[uri] = true;

    if (regexStaticFile.test(uri)) {
      if (debug) console.log('  STATIC: ' + cntVisited + ' ' + uri);
      return;
    }
    if (regexSkip && regexSkip.test(uri)) {
      if (debug) console.log('  SKIP: ' + uri);
      return;
    }

    cntVisited++;
    if (cntVisited > limit) {
      if (debug) console.log('  LIMIT: ' + cntVisited + ' ' + uri);
      return;
    }
    if (debug) console.log('VISIT: ' + cntVisited + ' ' + uri);

    return rp(uri)
      .then(html => {
        allVisited.push(uri);

        //if (regexStaticFile.test(uri)) {
        //  return Promise.reject({ uri, name: 'SkipStatic' });
        //}

        let r = getLinks(html);
        let links = r.getInternalLinks();
        if (links.length == 0) {
          if (debug) console.log('  DONE: ' + cntVisited + ' ' + uri);
          return;
        }

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
          if (err.statusCode >= 500) {
            return Promise.reject(err);
          }
        } else if (err.name === 'RequestError') {
          console.log(err.message + ': ' + uri);
        } else {
          console.log(err);
          console.log(Object.keys(err));
          return Promise.reject(err);
        }
      });
  };

  return crawl;
};
