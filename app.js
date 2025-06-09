const express = require('express');
const { engine } = require('express-handlebars');
const session = require('express-session');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize database first
const db = require('./database/db');

// View engine setup
app.engine('handlebars', engine({
    defaultLayout: 'main',
    layoutsDir: path.join(__dirname, 'views/layouts'),
    partialsDir: path.join(__dirname, 'views/partials')
}));
app.set('view engine', 'handlebars');
app.set('views', path.join(__dirname, 'views'));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key-here',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        maxAge: 24 * 60 * 60 * 1000
    }
}));

// Initialize database and wait for it
let dbInitialized = false;
db.initialize().then(() => {
    console.log('Database initialized successfully');
    dbInitialized = true;
}).catch(err => {
    console.error('Database initialization failed:', err);
});

// Middleware to check if database is ready
const checkDb = (req, res, next) => {
    if (!dbInitialized) {
        return res.status(503).send('Database not ready');
    }
    next();
};

// Home route
app.get('/', (req, res) => {
    if (req.session.user) {
        return res.redirect('/dashboard');
    }
    res.redirect('/login');
});

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        db: dbInitialized ? 'ready' : 'not ready'
    });
});

// Signup routes
app.get('/signup', (req, res) => {
    res.render('signup', {
        title: 'Sign Up',
        errors: req.session.errors || [],
        oldInput: req.session.oldInput || {}
    });

    delete req.session.errors;
    delete req.session.oldInput;
});

// Simple email validation function
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Signup with custom validation
app.post('/signup', checkDb, async (req, res) => {
    try {
        const { email, password, confirmPassword } = req.body;
        const errors = [];

        // Custom validation
        if (!email || email.trim() === '') {
            errors.push({ msg: 'Email is required' });
        } else if (!isValidEmail(email.trim())) {
            errors.push({ msg: 'Please enter a valid email address' });
        }

        if (!password) {
            errors.push({ msg: 'Password is required' });
        } else if (password.length < 8) {
            errors.push({ msg: 'Password must be at least 8 characters' });
        }

        if (!confirmPassword) {
            errors.push({ msg: 'Password confirmation is required' });
        } else if (password !== confirmPassword) {
            errors.push({ msg: 'Passwords do not match' });
        }

        if (errors.length > 0) {
            req.session.errors = errors;
            req.session.oldInput = req.body;
            return res.redirect('/signup');
        }

        // Check if user already exists
        const existingUser = await db.getUserByEmail(email.trim().toLowerCase());
        if (existingUser) {
            req.session.errors = [{ msg: 'Email is already registered' }];
            req.session.oldInput = req.body;
            return res.redirect('/signup');
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const userId = await db.createUser(email.trim().toLowerCase(), hashedPassword);

        // Log user in automatically
        req.session.user = {
            id: userId,
            email: email.trim().toLowerCase()
        };

        res.redirect('/dashboard');

    } catch (error) {
        console.error('Signup error:', error);
        req.session.errors = [{ msg: 'Registration failed. Please try again.' }];
        req.session.oldInput = req.body;
        res.redirect('/signup');
    }
});

// Login routes
app.get('/login', (req, res) => {
    res.render('login', {
        title: 'Login',
        errors: req.session.errors || [],
        success: req.session.success || null,
        oldInput: req.session.oldInput || {}
    });

    delete req.session.errors;
    delete req.session.success;
    delete req.session.oldInput;
});

// Login with custom validation
app.post('/login', checkDb, async (req, res) => {
    try {
        const { email, password } = req.body;
        const errors = [];

        // Custom validation
        if (!email || email.trim() === '') {
            errors.push({ msg: 'Email is required' });
        } else if (!isValidEmail(email.trim())) {
            errors.push({ msg: 'Please enter a valid email address' });
        }

        if (!password) {
            errors.push({ msg: 'Password is required' });
        }

        if (errors.length > 0) {
            req.session.errors = errors;
            req.session.oldInput = req.body;
            return res.redirect('/login');
        }

        // Get user from database
        const user = await db.getUserByEmail(email.trim().toLowerCase());
        if (!user) {
            req.session.errors = [{ msg: 'Invalid email or password' }];
            req.session.oldInput = req.body;
            return res.redirect('/login');
        }

        // Check password
        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            req.session.errors = [{ msg: 'Invalid email or password' }];
            req.session.oldInput = req.body;
            return res.redirect('/login');
        }

        // Log user in
        req.session.user = {
            id: user.id,
            email: user.email
        };

        res.redirect('/dashboard');

    } catch (error) {
        console.error('Login error:', error);
        req.session.errors = [{ msg: 'Login failed. Please try again.' }];
        req.session.oldInput = req.body;
        res.redirect('/login');
    }
});

// Dashboard route
app.get('/dashboard', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    res.render('dashboard', {
        user: req.session.user,
        title: 'Dashboard'
    });
});

// Logout route
app.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Logout error:', err);
        }
        res.redirect('/login');
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

// 404 handler
app.use((req, res) => {
    res.status(404).send('Page not found');
});

// Start server
if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => {
        console.log(`🚀 Uptime Kama server running on http://localhost:${PORT}`);
        console.log(`📊 Health check available at http://localhost:${PORT}/health`);
        console.log(`🔑 Signup page at http://localhost:${PORT}/signup`);
    });
}

module.exports = app;