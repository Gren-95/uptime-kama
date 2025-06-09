const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const db = require('../database/db');

const router = express.Router();

// Validation rules for password
const passwordValidation = [
    body('password')
        .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
        .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
        .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
        .matches(/\d/).withMessage('Password must contain at least one number')
        .matches(/[!@#$%^&*(),.?":{}|<>]/).withMessage('Password must contain at least one special character'),
    body('confirmPassword').custom((value, { req }) => {
        if (value !== req.body.password) {
            throw new Error('Passwords do not match');
        }
        return true;
    })
];

// GET /auth/signup
router.get('/signup', (req, res) => {
    res.render('signup', {
        title: 'Sign Up',
        errors: req.session.errors || [],
        oldInput: req.session.oldInput || {}
    });

    // Clear session data
    delete req.session.errors;
    delete req.session.oldInput;
});

// POST /auth/signup
router.post('/signup', [
    body('username')
        .trim()
        .isLength({ min: 3 }).withMessage('Username must be at least 3 characters long')
        .matches(/^[a-zA-Z0-9_.-]+$/).withMessage('Username can only contain letters, numbers, dots, hyphens, and underscores'),
    ...passwordValidation
], async (req, res) => {
    try {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            req.session.errors = errors.array();
            req.session.oldInput = req.body;
            return res.redirect('/auth/signup');
        }

        const { username, password } = req.body;

        // Check if user already exists
        const existingUser = await db.getUserByUsername(username);
        if (existingUser) {
            req.session.errors = [{ msg: 'Username is already taken' }];
            req.session.oldInput = req.body;
            return res.redirect('/auth/signup');
        }

        // Hash password
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Create user
        const userId = await db.createUser(username, hashedPassword);

        // Log user in automatically
        req.session.user = {
            id: userId,
            username: username
        };

        // Redirect to dashboard
        res.redirect('/dashboard');

    } catch (error) {
        console.error('Signup error:', error);
        req.session.errors = [{ msg: 'An error occurred during registration. Please try again.' }];
        req.session.oldInput = req.body;
        res.redirect('/auth/signup');
    }
});

// GET /auth/login
router.get('/login', (req, res) => {
    res.render('login', {
        title: 'Login',
        errors: req.session.errors || [],
        success: req.session.success || null,
        oldInput: req.session.oldInput || {}
    });

    // Clear session data
    delete req.session.errors;
    delete req.session.success;
    delete req.session.oldInput;
});

// POST /auth/login
router.post('/login', [
    body('username').trim().notEmpty().withMessage('Username is required'),
    body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            req.session.errors = errors.array();
            req.session.oldInput = req.body;
            return res.redirect('/auth/login');
        }

        const { username, password } = req.body;

        // Get user from database
        const user = await db.getUserByUsername(username);
        if (!user) {
            req.session.errors = [{ msg: 'Invalid username or password' }];
            req.session.oldInput = req.body;
            return res.redirect('/auth/login');
        }

        // Check password
        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            req.session.errors = [{ msg: 'Invalid username or password' }];
            req.session.oldInput = req.body;
            return res.redirect('/auth/login');
        }

        // Log user in
        req.session.user = {
            id: user.id,
            username: user.username
        };

        res.redirect('/dashboard');

    } catch (error) {
        console.error('Login error:', error);
        req.session.errors = [{ msg: 'An error occurred during login. Please try again.' }];
        req.session.oldInput = req.body;
        res.redirect('/auth/login');
    }
});

// POST /auth/logout
router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Logout error:', err);
        }
        res.redirect('/auth/login');
    });
});

module.exports = router;