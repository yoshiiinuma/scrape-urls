
class ScrapedLinks {
  constructor(host, known = {}, debug = false) {
    this.host = host;
    this.known = known;
    this.debug = debug;
    this.count = 0;

    this.internals = [];
    this.externals = [];
    this.anchors = [];
    this.absolute = [];
    this.relative = [];
    this.resources = [];
    this.scripts = [];
    this.images = [];
    this.regexHost = new RegExp('^https?://' + this.host);
  }

  getInternalLinks() {
    return this.internals;
  } 

  getExternalLinks() {
    return this.externals;
  } 

  getAnchorLinks() {
    return this.anchors;
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

  toAbsolute(link) {
    if (!link) return link;
    if (link.startsWith('http')) return link;
    if (link.startsWith('/')) return this.host + link;
    if (link.startsWith('#')) return this.host + link;
    if (link.startsWith('?')) return this.host + link;
    return this.host + '/' + link;
  }

  setResource(link) {
    let r = this.setLink(link);
    if (r) this.resources.push(r);
  } 

  setScript(link) {
    let r = this.setLink(link);
    if (r) this.scripts.push(r);
  } 

  setImage(link) {
    let r = this.setLink(link);
    if (r) this.images.push(r);
  } 

  setLink(link) {
    if (!link) return null;

    if (link.endsWith('/')) {
      link = link.replace(/\/$/, '');
    }
    if (this.known[link]) return null;
    this.known[link] = true;

    if (link.startsWith('#')) {
      console.log()
      this.anchors.push(link);
    } else if (link.startsWith('/')) {
      this.count++;
      this.relative.push(link);
      link = this.toAbsolute(link);
      this.internals.push(link);
      this.known[link] = true;
      if (this.debug) console.log('  REL >>> ' + this.count + ': ' + link);
    } else {
      if (this.regexHost.test(link)) {
        this.count++;
        this.absolute.push(link);
        this.internals.push(link);
        if (this.debug) console.log('  ABS >>> ' + this.count + ': ' + link);
      } else {
        if (this.debug) console.log('  EXT >>> ' + this.count + ': ' + link);
        this.externals.push(link);
      }
    }
    return link;
  } 
}

module.exports = ScrapedLinks;
