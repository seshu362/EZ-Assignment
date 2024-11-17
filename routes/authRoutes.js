const express = require('express');
const { registerUser, loginUser } = require('../controllers/authController'); // Import controller
const router = express.Router();

router.post('/register', registerUser); // Route for registration
router.post('/login', loginUser);       // Route for login

module.exports = router;
