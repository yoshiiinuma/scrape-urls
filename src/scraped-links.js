
class ScrapedLinks {
  constructor(url, known = {}, allFound = [], debug = false) {
    this.url = url;
    this.known = known;
    this.allFound = allFound;
    this.debug = debug;
    this.count = 0;

    this.internals = [];
    this.externals = [];
    this.fragments = [];
    this.absolute = [];
    this.relative = [];
    this.resources = [];
    this.scripts = [];
    this.images = [];
    this.regexHost = new RegExp('^https?://' + this.url.host);
    this.regexPath = /^https?:\/\/.+\//;
  }

  getInternalLinks() {
    return this.internals;
  }

  getExternalLinks() {
    return this.externals;
  }

  getAnchorLinks() {
    return this.fragments;
  }

  getAbsoluteLinks() {
    return this.absolute;
  }

  getRelativeLinks() {
    return this.relative;
  }

  getResourceLinks() {
    return this.resources;
  }

  getScriptLinks() {
    return this.scripts;
  }

  getImageLinks() {
    return this.images;
  }

  isKnown(link) {
    return this.known[link]? true : false;
  }

  removeFragment(link) {
    return link.replace(/#[^#]+$/, '');
  }

  //Delete everything after '?'
  removeQueries(link) {
    return link.replace(/?[^?]+$/, '');
  }

  //Delete everything after the last '/'
  removeFilename(link) {
    if (!this.regexPath.test(link)) return link;
    return link.replace(/\/[^\/]+$/, '/');
  }

  toAbsolute(link, curUrl) {
    let urlPrefix = this.removeFilename(curUrl);

    if (!link) return link;
    if (link.startsWith('http')) return link;
    if (link.startsWith('//')) return this.url.protocol + link;
    if (link.startsWith('/')) return this.url.origin + link;
    if (link.startsWith('#')) return urlPrefix + link;
    if (link.startsWith('?')) return urlPrefix + link;
    if (link.startsWith('../')) {
      let path = link;
      while (path.startsWith('../')) {
        path = path.replace('../', '');
        urlPrefix = this.removeFilename(urlPrefix.replace(/\/$/, ''));
      }
      console.log('#### REL2ABS AAA: ' + curUrl + ' + ' + link + ' ==> ' + urlPrefix + path);
      throw 'ScrapedLinks#toAbsolute Check it out!!!';
      return urlPrefix + path;
    }
    if (link.startsWith('./')) {
      let path = link.replace('./', '');
      console.log('#### REL2ABS BBB: ' + curUrl + ' + ' + link + ' ==> ' + urlPrefix + path);
      throw 'ScrapedLinks#toAbsolute Check it out!!!';
      return urlPrefix + path;
    }
    return urlPrefix + '/' + link;
  }

  setResource(link, url) {
    let r = this.setLink(link, url);
    if (r) this.resources.push(r);
  }

  setScript(link, url) {
    let r = this.setLink(link, url);
    if (r) this.scripts.push(r);
  }

  setImage(link, url) {
    let r = this.setLink(link, url);
    if (r) this.images.push(r);
  }

  setLink(link, currentUrl) {
    if (!link) return null;

    if (!link.startsWith('#')) {
      link = link.replace(/#[^#]+$/, ''); //Remove fragments
    }
    if (this.known[link]) return null;
    this.known[link] = true;

    if (link.startsWith('#')) {
      if (this.debug) console.log('    ANC >>> ' + this.count + ': ' + link);
      this.fragments.push(link);
    } else if (link.startsWith('/')) {
      this.count++;
      this.relative.push(link);
      link = this.toAbsolute(link, currentUrl);
      this.internals.push(link);
      this.allFound.push(link);
      this.known[link] = true;
      if (this.debug) console.log('    REL >>> ' + this.count + ': ' + link);
    } else {
      if (this.regexHost.test(link)) {
        this.count++;
        this.absolute.push(link);
        this.internals.push(link);
        this.allFound.push(link);
        if (this.debug) console.log('    ABS >>> ' + this.count + ': ' + link);
      } else {
        if (this.debug) console.log('    EXT >>> ' + this.count + ': ' + link);
        this.externals.push(link);
      }
    }
    return link;
  }
}

module.exports = ScrapedLinks;
