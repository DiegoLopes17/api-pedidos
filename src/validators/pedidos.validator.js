const { TIPOS, PRIORIDADES, STATUS } = require('../constants/pedidos');
const { ValidationError } = require('../errors/AppError');

function ehObjeto(corpo) {
  return corpo !== null && typeof corpo === 'object' && !Array.isArray(corpo);
}

function validarNovoPedido(corpo) {
  if (!ehObjeto(corpo)) {
    throw new ValidationError('Corpo da requisição inválido', [
      'envie um objeto JSON com cliente, tipo, valor e prioridade',
    ]);
  }

  const erros = [];

  if (typeof corpo.cliente !== 'string' || corpo.cliente.trim() === '') {
    erros.push('cliente é obrigatório e não pode ser vazio');
  }

  if (!TIPOS.includes(corpo.tipo)) {
    erros.push(`tipo deve ser um destes valores: ${TIPOS.join(', ')}`);
  }

  if (typeof corpo.valor !== 'number' || !Number.isFinite(corpo.valor) || corpo.valor <= 0) {
    erros.push('valor deve ser numérico e maior que zero');
  }

  if (!PRIORIDADES.includes(corpo.prioridade)) {
    erros.push(`prioridade deve ser um destes valores: ${PRIORIDADES.join(', ')}`);
  }

  if (erros.length > 0) {
    throw new ValidationError('Dados inválidos', erros);
  }

  return {
    cliente: corpo.cliente.trim(),
    tipo: corpo.tipo,
    valor: corpo.valor,
    prioridade: corpo.prioridade,
  };
}

function validarNovoStatus(corpo) {
  if (!ehObjeto(corpo) || !STATUS.includes(corpo.status)) {
    throw new ValidationError('Dados inválidos', [
      `status deve ser um destes valores: ${STATUS.join(', ')}`,
    ]);
  }

  return corpo.status;
}

module.exports = { validarNovoPedido, validarNovoStatus };
