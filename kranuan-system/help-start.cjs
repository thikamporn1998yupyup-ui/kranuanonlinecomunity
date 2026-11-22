'use strict';
/**
 * KRANUAN HELP deployment entry point.
 * Starts the existing dispatch-center unchanged and adds independent HELP APIs/UI.
 * Render Start Command: node help-start.cjs
 */
const dispatch = require('./dispatch-start.cjs');
const publicPages = new Set(['/', '/index.html', '/rider/', '/rider/index.html', '/admin.html', '/owner-portal/', '/owner-portal/index.html']);
const scriptTag = '<script defer src="/help-ui.js?v=20261123-1"></script>';

function injectHelpUI(res) {
  const originalWriteHead = res.writeHead.bind(res);
  const originalEnd = res.end.bind(res);
  const originalWrite = res.write.bind(res);
  const originalRemoveHeader = res.removeHeader.bind(res);
  let head = null;
  const chunks = [];

  res.writeHead = function(status, ...args) {
    head = {status, args};
    res.statusCode = status;
    return res;
  };
  res.write = function(data, encoding, callback) {
    if (data) chunks.push(Buffer.isBuffer(data) ? data : Buffer.from(data, typeof encoding === 'string' ? encoding : undefined));
    if (typeof encoding === 'function') encoding();
    else if (typeof callback === 'function') callback();
    return true;
  };
  res.end = function(data, encoding, callback) {
    if (data) chunks.push(Buffer.isBuffer(data) ? data : Buffer.from(data, typeof encoding === 'string' ? encoding : undefined));
    let body = Buffer.concat(chunks);
    let headers = {};
    if (head) {
      const last = head.args.at(-1);
      if (last && typeof last === 'object' && !Array.isArray(last)) headers = {...last};
    }
    const mime = String(headers['Content-Type'] || headers['content-type'] || res.getHeader('Content-Type') || '');
    const isHtml = res.statusCode === 200 && mime.includes('text/html') &&
      !res.getHeader('Content-Encoding') && !headers['Content-Encoding'] && !headers['content-encoding'];
    if (isHtml) {
      let html = body.toString('utf8');
      if (!html.includes('/help-ui.js')) html = html.replace(/<\/body\s*>/i, scriptTag + '</body>');
      body = Buffer.from(html);
      delete headers.ETag;
      delete headers.etag;
      originalRemoveHeader('ETag');
    }
    delete headers['Content-Length'];
    delete headers['content-length'];
    headers['Content-Length'] = body.length;
    if (head) originalWriteHead(head.status, headers);
    else originalWriteHead(res.statusCode, headers);
    res.writeHead = originalWriteHead;
    res.write = originalWrite;
    res.end = originalEnd;
    return originalEnd(body, typeof encoding === 'function' ? encoding : callback);
  };
}

async function start() {
  // Preserve the current dispatch, ride, payments, community chat and legacy routes.
  const stack = await dispatch.start();
  const server = stack.core.server;
  const previous = server.listeners('request')[0];
  if (typeof previous !== 'function') throw Error('Existing dispatch request handler not found');

  let firebaseRef = null;
  if (process.env.KRANUAN_TEST_SQLITE !== '1') {
    const admin = require('firebase-admin');
    const app = admin.apps[0];
    if (!app) throw Error('Firebase missing, KRANUAN HELP cannot start');
    firebaseRef = app.database().ref('/kranuanonline/community_help_v1');
  }
  const help = require('./community-help.cjs')({
    db:stack.core.db, ref:firebaseRef,
    onJobCreated: async ({job, request}) => {
      // Use the existing dispatch API to persist the announcement in its own Firebase state.
      // No direct writes to dispatch tables, preserving the existing save/notify lifecycle.
      const safeMessage = '[KR-HELP:' + job.id + '] เปิดรับงาน ' + job.title +
        ' | ' + job.area + ' | ค่าจ้าง ' + job.budget + ' บาท';
      const payload = Buffer.from(JSON.stringify({message:safeMessage.slice(0,500),client_key:'help-job-'+job.id}));
      const internalReq = {
        method:'POST',url:'/api/dispatch/community',
        headers:{...request.headers},
        async *[Symbol.asyncIterator]() {yield payload;}
      };
      let responseStatus = 500, body = '';
      const internalRes = {
        headersSent:false, writableEnded:false,
        writeHead(code) {responseStatus=code;this.headersSent=true;return this;},
        end(value) {body+=value||'';this.writableEnded=true;return this;}
      };
      await stack.feature.handler(internalReq,internalRes,new URL('http://localhost/api/dispatch/community'));
      if (responseStatus >= 400) throw Error('Dispatch chat returned '+responseStatus+': '+body.slice(0,200));
    }
  });
  server.removeListener('request', previous);
  server.on('request', async(req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      if (url.pathname === '/api/help/health' && req.method === 'GET') {
        res.writeHead(200, {'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store'});
        return res.end(JSON.stringify({ok:true,service:'kranuan-help',version:1}));
      }
      if (url.pathname.startsWith('/api/help/')) return await help.handler(req, res, url);
      if (req.method === 'GET' && publicPages.has(url.pathname)) injectHelpUI(res);
      return await previous(req, res);
    } catch(error) {
      console.error('KRANUAN HELP wrapper:', error);
      if (!res.headersSent) {
        res.writeHead(500, {'Content-Type':'application/json; charset=utf-8'});
        res.end(JSON.stringify({error:'บริการชุมชนขัดข้อง กรุณาลองใหม่'}));
      } else if (!res.writableEnded) res.end();
    }
  });
  console.log('KRANUAN HELP enabled alongside the existing dispatch-center');
  return {...stack, help};
}
if (require.main === module) start().catch(error => {
  console.error('KRANUAN HELP startup failed:', error);
  process.exitCode = 1;
});
module.exports = {start,injectHelpUI};
