'use strict';
// Static assets only. API responses and event streams never enter this cache.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {promisify} = require('node:util');
const gzip = promisify(require('node:zlib').gzip);
const digest = b => crypto.createHash('sha256').update(b).digest('hex');
const mime = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.gif':'image/gif','.woff2':'font/woff2','.json':'application/json; charset=utf-8','.ico':'image/x-icon'};
function createPerformance(publicDir) {
  const files = new Map(), generated = new Map(), hashes = {};
  function walk(dir) {
    for (const e of fs.readdirSync(dir, {withFileTypes:true})) {
      const file = path.join(dir,e.name);
      if(e.isDirectory()) walk(file);
      else if(e.isFile()) {
        const url = '/' + path.relative(publicDir,file).split(path.sep).join('/');
        files.set(url,file);
        if(/\.(?:js|css|svg|png|jpe?g|webp|gif|ico|woff2?)$/i.test(url)) hashes[url] = digest(fs.readFileSync(file));
      }
    }
  }
  walk(publicDir);
  // The five original hero photos become separate, byte-identical assets.
  const home = files.get('/index.html');
  let homeHTML = home ? fs.readFileSync(home,'utf8') : null;
  if(homeHTML) homeHTML = homeHTML.replace(/(const HERO_IMAGES\s*=\s*)(\{[^\n]+\})/, (whole,prefix,json) => {
    let values; try { values = JSON.parse(json); } catch { return whole; }
    for(const key of Object.keys(values)) {
      const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(values[key]);
      if(!m) continue;
      const bytes = Buffer.from(m[2],'base64'), hash = digest(bytes);
      const url = '/_kranuan/hero-' + hash + '.' + (m[1] === 'image/jpeg' ? 'jpg' : m[1].slice(6));
      generated.set(url,{bytes,type:m[1]}); hashes[url] = hash; values[key] = url;
    }
    return prefix + JSON.stringify(values);
  });
  // A deployment changes the worker even when only CSS/JS/images changed.
  const build = digest(JSON.stringify(hashes)).slice(0,20);
  const cache = new Map(), weights = new Map(); let used = 0;
  async function load(url) {
    if(cache.has(url)) return cache.get(url);
    const promise = (async()=>{
      let type = mime[path.extname(url)] || 'application/octet-stream';
      let bytes = generated.get(url)?.bytes || await fs.promises.readFile(files.get(url));
      if(url==='/index.html' && homeHTML) bytes = Buffer.from(homeHTML);
      if(type.startsWith('text/html')) {
        let html = bytes.toString('utf8');
        // A parser-blocking bootstrap must run before existing API clients.
        html = html.replace(/<(?:script|link)\b[^>]*>/gi, tag => tag.replace(/\b(src|href)=(['"])(.*?)\2/i, (attr,key,quote,value) => {
          const target=new URL(value,'http://kranuan.local'+url);
          if(target.origin!=='http://kranuan.local'||!hashes[target.pathname])return attr;
          target.searchParams.set('__kranuan_build',build);
          return key+'='+quote+target.pathname+target.search+target.hash+quote;
        }));
        html = html.replace(/<head\b[^>]*>/i, m => m+'<script src="/smart-cache.js?v='+build+'" data-kranuan-build="'+build+'"></script>');
        bytes = Buffer.from(html);
      }
      if(url==='/sw.js') bytes = Buffer.from('self.KRANUAN_ASSETS='+JSON.stringify(hashes)+';self.KRANUAN_BUILD='+JSON.stringify(build)+';\n'+bytes);
      if(url==='/OneSignalSDKWorker.js') bytes = Buffer.from('// Deployment '+build+'\n'+bytes);
      const zipped = /^(text\/|application\/json|image\/svg)/.test(type) && bytes.length>1024 ? await gzip(bytes) : null;
      const result = {bytes,zipped,type,etag:'W/"'+digest(bytes)+'"'};
      const weight=bytes.length+(zipped?.length||0);weights.set(url,weight);used += weight;
      while(used>32*1024*1024 && cache.size>1) {
        const key=weights.keys().next().value; if(key===url)break;
        cache.delete(key);used-=weights.get(key);weights.delete(key);
      }
      return result;
    })();
    cache.set(url,promise);
    promise.catch(()=>cache.delete(url)); return promise;
  }
  return async function serve(req,res,url) {
    let name;try{name=decodeURIComponent(url.pathname);}catch{return false;}
    if(name.endsWith('/')) name+='index.html';
    if(!files.has(name)&&!generated.has(name)) return false;
    if(!['GET','HEAD'].includes(req.method)) return false;
    const a=await load(name), html=a.type.startsWith('text/html');
    const worker = name==='/sw.js'||name==='/OneSignalSDKWorker.js';
    const immutable=generated.has(name);
    const headers={'Content-Type':a.type,'Cache-Control':immutable?'public, max-age=31536000, immutable':'no-cache','Vary':'Accept-Encoding',ETag:a.etag};
    if(worker) headers['Service-Worker-Allowed']='/';
    // dispatch-start injects its integration after this handler. It must see plain HTML.
    const transform=html && res.kranuanHTMLTransform;
    if(transform) delete headers.ETag;
    if(!transform && (req.headers['if-none-match']||'').split(',').map(x=>x.trim().replace(/^W\//,'')).includes(a.etag.replace(/^W\//,''))) {
      res.writeHead(304,headers);res.end();return true;
    }
    const acceptsGzip=String(req.headers['accept-encoding']||'').split(',').some(v=>/^\s*gzip\s*(?:;|$)/i.test(v)&&! /;\s*q=0(?:\.0*)?\s*$/i.test(v));
    const payload=!transform&&acceptsGzip&&a.zipped?a.zipped:a.bytes;
    if(payload===a.zipped) headers['Content-Encoding']='gzip';
    headers['Content-Length']=payload.length;
    res.writeHead(200,headers);res.end(req.method==='HEAD'?undefined:payload);return true;
  };
}
module.exports={createPerformance};
