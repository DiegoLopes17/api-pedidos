class AppError extends Error {
  constructor(mensagem, status, detalhes = []) {
    super(mensagem);
    this.name = this.constructor.name;
    this.status = status;
    this.detalhes = detalhes;
  }
}

class ValidationError extends AppError {
  constructor(mensagem = 'Dados inválidos', detalhes = []) {
    super(mensagem, 400, detalhes);
  }
}

class NotFoundError extends AppError {
  constructor(mensagem = 'Recurso não encontrado') {
    super(mensagem, 404);
  }
}

module.exports = { AppError, ValidationError, NotFoundError };
