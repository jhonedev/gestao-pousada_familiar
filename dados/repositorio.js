const fs = require("fs");
const path = require("path");
const { DatabaseSync } = require("node:sqlite");

const DB_FILE = path.join(__dirname, "..", "pousada.db");
const OLD_FILE = path.join(__dirname, "..", "db.json");
let db;

function rows(sql, params = []) {
  return db.prepare(sql).all(...params);
}
function run(sql, params = []) {
  return db.prepare(sql).run(...params);
}
function mapReservation(r) {
  return {id:r.id,quartoId:r.quarto_id,hospede:r.hospede,telefone:r.telefone,entrada:r.entrada,saida:r.saida,hospedes:r.hospedes,valorDiaria:r.valor_diaria,valorTotal:r.valor_total,observacoes:r.observacoes};
}
function inicializar() {
  const isNew = !fs.existsSync(DB_FILE);
  db = new DatabaseSync(DB_FILE);
  db.exec("PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000");
  if (isNew) {
    try {
      db.exec("BEGIN");
      db.exec(`CREATE TABLE quartos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        capacidade INTEGER NOT NULL,
        preco REAL NOT NULL,
        status TEXT NOT NULL DEFAULT 'Disponível',
        descricao TEXT DEFAULT ''
      )`);
      db.exec(`CREATE TABLE reservas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        quarto_id INTEGER NOT NULL,
        hospede TEXT NOT NULL,
        telefone TEXT DEFAULT '',
        entrada TEXT NOT NULL,
        saida TEXT NOT NULL,
        hospedes INTEGER NOT NULL,
        valor_diaria REAL NOT NULL,
        valor_total REAL NOT NULL DEFAULT 0,
        observacoes TEXT DEFAULT '',
        FOREIGN KEY (quarto_id) REFERENCES quartos(id) ON DELETE RESTRICT
      )`);
      // Importa os dados da versão anterior uma única vez, se o arquivo existir.
      if (fs.existsSync(OLD_FILE)) {
        const old = JSON.parse(fs.readFileSync(OLD_FILE, "utf8"));
        for (const q of old.quartos || []) {
          run("INSERT INTO quartos (id,nome,capacidade,preco,status,descricao) VALUES (?,?,?,?,?,?)",
            [q.id,q.nome,q.capacidade,q.preco,q.status||"Disponível",q.descricao||""]);
        }
        for (const r of old.reservas || []) {
          run("INSERT INTO reservas (id,quarto_id,hospede,telefone,entrada,saida,hospedes,valor_diaria,valor_total,observacoes) VALUES (?,?,?,?,?,?,?,?,?,?)",
            [r.id,r.quartoId,r.hospede,r.telefone||"",r.entrada,r.saida,r.hospedes,r.valorDiaria||0,r.valorTotal||0,r.observacoes||""]);
        }
      }
      db.exec("COMMIT");
    } catch (error) {
      db.close();
      fs.rmSync(DB_FILE, { force: true });
      throw error;
    }
  }

}

function transacao(operacao) {
  db.exec("BEGIN IMMEDIATE");
  try {
    const resultado = operacao();
    db.exec("COMMIT");
    return resultado;
  } catch (erro) {
    db.exec("ROLLBACK");
    throw erro;
  }
}

function buscarQuarto(id) {
  return rows("SELECT * FROM quartos WHERE id = ?", [id])[0];
}

function listarQuartos() {
  return rows("SELECT * FROM quartos ORDER BY id");
}

function salvarQuarto(quarto, id) {
  const valores = [quarto.nome, quarto.capacidade, quarto.preco, quarto.status, quarto.descricao];
  if (id === undefined) {
    const resultado = run(
      "INSERT INTO quartos (nome, capacidade, preco, status, descricao) VALUES (?, ?, ?, ?, ?)",
      valores
    );
    return buscarQuarto(resultado.lastInsertRowid);
  }
  run("UPDATE quartos SET nome=?, capacidade=?, preco=?, status=?, descricao=? WHERE id=?", [...valores, id]);
  return buscarQuarto(id);
}

function excluirQuarto(id) {
  run("DELETE FROM quartos WHERE id = ?", [id]);
}

function buscarReserva(id) {
  const reserva = rows("SELECT * FROM reservas WHERE id = ?", [id])[0];
  return reserva && mapReservation(reserva);
}

function listarReservas(quartoId) {
  const reservas = quartoId
    ? rows("SELECT * FROM reservas WHERE quarto_id = ? ORDER BY entrada", [quartoId])
    : rows("SELECT * FROM reservas ORDER BY entrada");
  return reservas.map(mapReservation);
}

function temReservas(quartoId) {
  return rows("SELECT 1 FROM reservas WHERE quarto_id = ? LIMIT 1", [quartoId]).length > 0;
}

function temReservaAcimaDaCapacidade(quartoId, capacidade) {
  return rows(
    "SELECT 1 FROM reservas WHERE quarto_id = ? AND hospedes > ? LIMIT 1",
    [quartoId, capacidade]
  ).length > 0;
}

function temSobreposicao(quartoId, reservaId, entrada, saida) {
  return rows(
    "SELECT 1 FROM reservas WHERE quarto_id = ? AND id != ? AND entrada < ? AND saida > ? LIMIT 1",
    [quartoId, reservaId ?? -1, saida, entrada]
  ).length > 0;
}

function salvarReserva(reserva, id) {
  const valores = [
    reserva.quartoId, reserva.hospede, reserva.telefone, reserva.entrada, reserva.saida,
    reserva.hospedes, reserva.valorDiaria, reserva.valorTotal, reserva.observacoes
  ];
  if (id === undefined) {
    const resultado = run(
      `INSERT INTO reservas (quarto_id, hospede, telefone, entrada, saida, hospedes, valor_diaria, valor_total, observacoes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, valores
    );
    return buscarReserva(resultado.lastInsertRowid);
  }
  run(
    `UPDATE reservas SET quarto_id=?, hospede=?, telefone=?, entrada=?, saida=?, hospedes=?,
     valor_diaria=?, valor_total=?, observacoes=? WHERE id=?`, [...valores, id]
  );
  return buscarReserva(id);
}

function excluirReserva(id) {
  run("DELETE FROM reservas WHERE id = ?", [id]);
}

module.exports = {
  inicializar, transacao, buscarQuarto, listarQuartos, salvarQuarto, excluirQuarto,
  buscarReserva, listarReservas, temReservas, temReservaAcimaDaCapacidade, temSobreposicao,
  salvarReserva, excluirReserva
};
