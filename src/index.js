/**
 * atne storage —— 你自己的文件仓库
 *
 * 这个 Worker 是你和你的 R2 桶之间唯一的门。
 * 密钥（UPLOAD_KEY）只存在这里，永远不会进浏览器，也不会进 atne 的服务器。
 *
 *   GET    /                 健康检查
 *   GET    /_ping            带 x-upload-key 时顺便告诉你口令对不对
 *   GET    /f/<名字>          公开读取（不需要口令，链接就是靠这个）
 *   PUT    /<名字>            上传（需要 x-upload-key）
 *   DELETE /<名字>            删除（需要 x-upload-key）
 */

const VERSION = '1.0.0';

function corsHeaders(env) {
  return {
    'Access-Control-Allow-Origin': env.ALLOW_ORIGIN || '*',
    'Access-Control-Allow-Methods': 'GET,HEAD,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'x-upload-key,content-type',
    'Access-Control-Max-Age': '86400',
  };
}

function json(obj, status, cors) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...cors, 'content-type': 'application/json; charset=utf-8' },
  });
}

/** 逐字符全比一遍，不因为前缀相同就提前返回 */
function sameKey(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function authed(req, env) {
  return !!env.UPLOAD_KEY && sameKey(req.headers.get('x-upload-key') || '', env.UPLOAD_KEY);
}

/** 把路径还原成对象名，顺手挡掉穿越和奇怪字符 */
function keyOf(pathname, strip) {
  let k = pathname;
  if (strip && k.startsWith(strip)) k = k.slice(strip.length);
  k = k.replace(/^\/+/, '');
  try { k = decodeURIComponent(k); } catch (_) {}
  if (!k || k.includes('..') || k.startsWith('/')) return '';
  return k;
}

export default {
  async fetch(req, env) {
    const cors = corsHeaders(env);
    const url = new URL(req.url);
    const maxBytes = (Number(env.MAX_MB) || 25) * 1024 * 1024;

    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

    if (!env.BUCKET) {
      return json({ ok: false, error: 'R2 桶没绑上（binding 应该叫 BUCKET）' }, 500, cors);
    }

    /* ---------- 健康检查 / 口令自检 ---------- */
    if ((req.method === 'GET' || req.method === 'HEAD') &&
        (url.pathname === '/' || url.pathname === '/_ping')) {
      const body = { ok: true, service: 'atne-storage', version: VERSION, maxMB: maxBytes / 1048576 };
      if (url.pathname === '/_ping') {
        body.hasKey = !!env.UPLOAD_KEY;
        body.auth = authed(req, env);
      }
      return json(body, 200, cors);
    }

    /* ---------- 公开读 ---------- */
    if (req.method === 'GET' || req.method === 'HEAD') {
      const key = keyOf(url.pathname, '/f');
      if (!key) return json({ ok: false, error: '路径不对' }, 400, cors);

      const obj = await env.BUCKET.get(key);
      if (!obj) return json({ ok: false, error: '文件不存在' }, 404, cors);

      const h = new Headers(cors);
      obj.writeHttpMetadata(h);
      h.set('etag', obj.httpEtag);
      // 名字里带随机串，内容不会变，可以放心长缓存
      h.set('cache-control', 'public, max-age=31536000, immutable');
      return new Response(req.method === 'HEAD' ? null : obj.body, { headers: h });
    }

    /* ---------- 上传 ---------- */
    if (req.method === 'PUT') {
      if (!env.UPLOAD_KEY) return json({ ok: false, error: '这个 Worker 还没设置 UPLOAD_KEY' }, 500, cors);
      if (!authed(req, env)) return json({ ok: false, error: '口令不对' }, 403, cors);

      const key = keyOf(url.pathname);
      if (!key) return json({ ok: false, error: '要给文件起个名字' }, 400, cors);

      const len = Number(req.headers.get('content-length') || 0);
      if (len > maxBytes) {
        return json({ ok: false, error: `文件超过 ${maxBytes / 1048576}MB 上限` }, 413, cors);
      }

      await env.BUCKET.put(key, req.body, {
        httpMetadata: { contentType: req.headers.get('content-type') || 'application/octet-stream' },
      });
      return json({ ok: true, pathname: key, url: `${url.origin}/f/${encodeURI(key)}` }, 200, cors);
    }

    /* ---------- 删除 ---------- */
    if (req.method === 'DELETE') {
      if (!authed(req, env)) return json({ ok: false, error: '口令不对' }, 403, cors);
      const key = keyOf(url.pathname);
      if (!key) return json({ ok: false, error: '路径不对' }, 400, cors);
      await env.BUCKET.delete(key);
      return json({ ok: true }, 200, cors);
    }

    return json({ ok: false, error: '不支持这个方法' }, 405, cors);
  },
};
