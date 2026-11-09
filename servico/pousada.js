const dados = require("../dados/repositorio");

function validateRoom(data) {
  if (typeof data.nome !== "string" || !data.nome.trim() || !data.capacidade || !data.preco) return "Preencha todos os campos obrigatórios.";
  if (!Number.isSafeInteger(Number(data.capacidade)) || Number(data.capacidade) < 1 || !Number.isFinite(Number(data.preco)) || Number(data.preco) <= 0) return "Capacidade e preço devem ser maiores que zero.";
  if (data.status && !["Disponível", "Ocupado", "Manutenção"].includes(data.status)) return "Selecione uma situação válida.";
  return "";
}
function validDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value);
  return Number.isFinite(+date) && date.toISOString().slice(0, 10) === value;
}
function validateReservation(data, room, id) {
  if (typeof data.hospede !== "string" || !data.hospede.trim() || !data.entrada || !data.saida || !data.hospedes || !data.quartoId)
    return "Preencha todos os campos obrigatórios.";
  if (![data.entrada, data.saida].every(validDate)) return "Informe datas válidas.";
  if (data.valorDiaria != null && (!Number.isFinite(Number(data.valorDiaria)) || Number(data.valorDiaria) < 0))
    return "Informe uma diária válida.";
  if (data.saida <= data.entrada) return "A data de saída deve ser posterior à entrada.";
  if (!room) return "Selecione um quarto válido.";
  if (!Number.isSafeInteger(Number(data.hospedes)) || Number(data.hospedes) < 1 || Number(data.hospedes) > Number(room.capacidade))
    return `Este quarto comporta de 1 a ${room.capacidade} hóspedes.`;
  if (dados.temSobreposicao(room.id, id, data.entrada, data.saida))
    return "Este quarto já possui reserva nesse período.";
  return "";
}
class ErroServico extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

function salvarQuarto(data, id) {
  const problema = validateRoom(data);
  if (problema) throw new ErroServico(problema);
  const capacidade = Number(data.capacidade);

  return dados.transacao(() => {
    const atual = id === undefined ? null : dados.buscarQuarto(id);
    if (id !== undefined && !atual) throw new ErroServico("Quarto não encontrado.", 404);
    if (atual && dados.temReservaAcimaDaCapacidade(id, capacidade)) {
      throw new ErroServico("A capacidade não pode ser menor que hóspedes de reservas existentes.");
    }
    return dados.salvarQuarto({
      nome: data.nome.trim(),
      capacidade,
      preco: Number(data.preco),
      status: data.status || atual?.status || "Disponível",
      descricao: data.descricao || ""
    }, id);
  });
}

function excluirQuarto(id) {
  dados.transacao(() => {
    if (dados.temReservas(id)) {
      throw new ErroServico("Exclua as reservas deste quarto antes de excluí-lo.");
    }
    dados.excluirQuarto(id);
  });
}

function salvarReserva(data, id) {
  const quartoId = Number(data.quartoId);
  return dados.transacao(() => {
    const quarto = dados.buscarQuarto(quartoId);
    const problema = validateReservation({ ...data, quartoId }, quarto, id);
    if (problema) throw new ErroServico(problema);
    if (id !== undefined && !dados.buscarReserva(id)) {
      throw new ErroServico("Reserva não encontrada.", 404);
    }

    const valorDiaria = Number(data.valorDiaria ?? quarto.preco);
    const noites = (Date.parse(data.saida) - Date.parse(data.entrada)) / 86400000;
    const valorTotal = Number((valorDiaria * noites).toFixed(2));
    if (!Number.isFinite(valorTotal)) throw new ErroServico("Valor total inválido.");

    return dados.salvarReserva({
      quartoId,
      hospede: data.hospede.trim(),
      telefone: data.telefone || "",
      entrada: data.entrada,
      saida: data.saida,
      hospedes: Number(data.hospedes),
      valorDiaria,
      valorTotal,
      observacoes: data.observacoes || ""
    }, id);
  });
}

const recursos = {
  quartos: {
    listar: dados.listarQuartos,
    criar: (data) => salvarQuarto(data),
    atualizar: (id, data) => salvarQuarto(data, id),
    excluir: excluirQuarto
  },
  reservas: {
    listar: dados.listarReservas,
    criar: (data) => salvarReserva(data),
    atualizar: (id, data) => salvarReserva(data, id),
    excluir: dados.excluirReserva
  }
};

module.exports = { ErroServico, recursos };
