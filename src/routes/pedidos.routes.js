const express = require('express');
const controller = require('../controllers/pedidos.controller');

const router = express.Router();

router.post('/', controller.criar);
router.get('/', controller.listar);
router.get('/:id', controller.buscarPorId);
router.patch('/:id/status', controller.atualizarStatus);

module.exports = router;
