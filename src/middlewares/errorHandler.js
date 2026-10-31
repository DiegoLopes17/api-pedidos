const { AppError, NotFoundError } = require('../errors/AppError');

function rotaNaoEncontrada(req, res, next) {
  next(new NotFoundError('Rota não encontrada'));
}

function tratarErros(err, req, res, next) {
  if (err instanceof AppError) {
    const corpo = { erro: err.message };
    if (err.detalhes.length > 0) {
      corpo.detalhes = err.detalhes;
    }
    return res.status(err.status).json(corpo);
  }

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      erro: 'JSON inválido',
      detalhes: ['o corpo da requisição não é um JSON válido'],
    });
  }

  console.error(err);
  return res.status(500).json({ erro: 'Erro interno do servidor' });
}

module.exports = { rotaNaoEncontrada, tratarErros };
