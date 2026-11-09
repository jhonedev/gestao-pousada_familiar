const http = require("http");
const fs = require("fs");
const path = require("path");
const dados = require("./dados/repositorio");
const servico = require("./servico/pousada");

const PORT = process.env.PORT || 3000;
const PUBLIC = path.join(__dirname, "dist");

function send(res, status, data, type = "application/json") {
  res.writeHead(status, { "Content-Type": type });
  res.end(type === "application/json" ? JSON.stringify(data) : data);
}
function error(res, message, status = 400) { send(res, status, { erro: message }); }
function body(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", chunk => raw += chunk);
    req.on("end", () => {
      try { resolve(raw ? JSON.parse(raw) : {}); }
      catch { reject(new Error("JSON inválido.")); }
    });
  });
}
dados.inicializar();

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts[0] !== "api") {
    const file = parts.length ? path.join(PUBLIC, ...parts) : path.join(PUBLIC, "index.html");
    if (!file.startsWith(PUBLIC + path.sep)) return send(res,404,"Arquivo não encontrado","text/plain");
    return fs.readFile(file,(err,content)=>{
      if(err)return send(res,404,"Arquivo não encontrado","text/plain");
      const ext=path.extname(file);
      const types={".html":"text/html; charset=utf-8",".css":"text/css; charset=utf-8",".js":"text/javascript; charset=utf-8"};
      send(res,200,content,types[ext]||"text/plain");
    });
  }
  try {
    const entity = parts[1];
    const resource = Object.hasOwn(servico.recursos, entity) && servico.recursos[entity];
    if (!resource) return error(res, "Rota não encontrada.", 404);

    const id = Number(parts[2]);
    if (req.method === "GET") {
      const quartoId = Number(url.searchParams.get("quartoId"));
      return send(res, 200, resource.listar(quartoId));
    }
    if (req.method === "DELETE") {
      resource.excluir(id);
      return send(res, 200, { ok: true });
    }
    if (req.method !== "POST" && req.method !== "PUT")
      return error(res, "Rota não encontrada.", 404);

    let data;
    try {
      data = await body(req);
      if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error();
    } catch {
      return error(res, "Envie um objeto JSON válido.");
    }
    if (req.method === "POST") return send(res, 201, resource.criar(data));
    return send(res, 200, resource.atualizar(id, data));
  } catch (err) {
    if (err instanceof servico.ErroServico) return error(res, err.message, err.status);
    console.error(err);
    return error(res, "Erro interno.", 500);
  }
});
server.listen(Number(PORT), "0.0.0.0", () => console.log(`Pousada Vento Leste: http://localhost:${PORT}`));
