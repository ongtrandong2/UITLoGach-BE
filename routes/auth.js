const router = require('express').Router();
const { register, signIn } = require('../controllers/auth');

router.post('/register', register);

router.post('/signin', signIn);

module.exports = router;