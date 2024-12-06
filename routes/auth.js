const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { jwtSecret, jwtExpiresIn } = require('../config');
const { findByUsername, findById } =
require('../models/user');
const fs = require('fs-extra')

const router = express.Router();

// Fungsi untuk membuat token JWT
const generateToken = (user) => {
 return jwt.sign({ id: user.id }, jwtSecret, { expiresIn: jwtExpiresIn });
};

router.get('/login', (req, res) => {
    res.send(`
        <html>
        <head>
            <title>Login</title>
        </head>
        <body>
            <h1>Login</h1>
            <form method="POST" action="/api/auth/login">
                <label for="username">Username:</label>
                <input type="text" id="username" name="username" required><br>
                <label for="password">Password:</label>
                <input type="password" id="password" name="password" required><br>
                <button type="submit">Login</button>
            </form>
        </body>
        </html>
    `);
});

// POST /api/auth/login - Handle login logic
router.post('/login', (req, res) => {
    const { username, password } = req.body;

    const user = findByUsername(username);
    if (!user) {
        return res.status(400).json({ message: 'User not found' });
    }

    const isPasswordValid = bcrypt.compareSync(password, user.password);
    if (!isPasswordValid) {
        return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = generateToken(user);
    
    return res.json({ message: 'Login successful', token });
});

// Login dan menghasilkan token JWT serta menyimpan ke db.json
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const user = findByUsername(username);

    if (!user) {
        return res.status(400).json({ message: 'User not found' });
    }

    const isPasswordValid = bcrypt.compareSync(password, user.password);
    if (!isPasswordValid) {
        return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = generateToken(user);

    // Save user data to db.json
    const userData = {
        id: user.id,
        username: user.username
    };

    try {
        const data = await fs.readJson('db.json').catch(() => ({ users: [] }));
        data.users.push(userData); // Add new user to the array
        await fs.writeJson('db.json', data); // Write data back to db.json

        return res.json({ message: 'Login successful', token });
    } catch (error) {
        console.error('Error writing to db.json:', error);
        return res.status(500).json({ message: 'Error saving user data' });
    }
});

// Middleware untuk memverifikasi JWT
const authenticateJWT = (req, res, next) => {
    const token = req.headers.authorization &&
req.headers.authorization.split(' ')[1];
    if (!token) {
    return res.status(401).json({ message: 'Token not provided' });
    }
    try {
        const decoded = jwt.verify(token, jwtSecret);
        req.user = findById(decoded.id); // Simpan data pengguna ke request
        next();
    } catch (err) {
        return res.status(403).json({ message: 'Invalid token'});
    }
};

// Rute yang dilindungi
router.get('/protected', authenticateJWT, (req, res) => {
    res.json({ message: 'This is protected data', user:
    req.user });
    });

module.exports = router;