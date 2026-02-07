const admin = require("firebase-admin");

// Inicializa uma vez (server-side)
if (!admin.apps.length) {
  const svc = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  admin.initializeApp({
    credential: admin.credential.cert(svc),
  });
}

const db = admin.firestore();

function esc(s = "") {
  return String(s).replace(/[&<>"']/g, m => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[m]));
}

exports.handler = async (event) => {
  try {
    const slugRaw = (event.queryStringParameters?.slug || "").trim();
    const slug = slugRaw.toLowerCase();

    if (!/^[a-z0-9-]{3,80}$/.test(slug)) {
      return { statusCode: 400, headers: {"content-type":"text/plain; charset=utf-8"}, body: "Slug inválido." };
    }

    const snap = await db.collection("sv_protocolos").doc(slug).get();

    if (!snap.exists) {
      return { statusCode: 404, headers: {"content-type":"text/plain; charset=utf-8"}, body: "Protocolo não encontrado." };
    }

    const p = snap.data() || {};
    if (!p.active) {
      return { statusCode: 404, headers: {"content-type":"text/plain; charset=utf-8"}, body: "Protocolo inativo." };
    }

    const title = p.title || slug;
    const subtitle = p.subtitle || "";
    const summary = p.summary || "";
    const flow = p.flowchartUrl || "";
    const bodyHtml = p.bodyHtml || "";

    const html = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${esc(title)} – PediUrgente</title>
  <style>
    :root{--line:#e5e7eb;--txt:#0f172a;}
    body{margin:0;font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial;color:var(--txt);background:#fff;}
    .wrap{max-width:980px;margin:0 auto;padding:18px 14px 40px;}
    h1{font-size:22px;margin:0 0 6px;}
    .sub{opacity:.8;margin:0 0 10px;}
    .sum{background:#f8fafc;border:1px solid var(--line);border-radius:14px;padding:12px;margin:12px 0 14px;}
    .flow img{width:100%;height:auto;border:1px solid var(--line);border-radius:14px;}
    .card{border:1px solid var(--line);border-radius:16px;padding:14px;}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <h1>${esc(title)}</h1>
      ${subtitle ? `<p class="sub">${esc(subtitle)}</p>` : ``}
      ${summary ? `<div class="sum">${esc(summary)}</div>` : ``}
      ${flow ? `<div class="flow" style="margin:10px 0 14px;"><img alt="Fluxograma" src="${esc(flow)}"></div>` : ``}
      <div class="proto">${bodyHtml}</div>
    </div>
  </div>
</body>
</html>`;

    return {
      statusCode: 200,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "public, max-age=60"
      },
      body: html,
    };

  } catch (e) {
    console.error(e);
    return { statusCode: 500, headers: {"content-type":"text/plain; charset=utf-8"}, body: "Erro interno." };
  }
};
