// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const { engine } = require('express-handlebars');
const session = require('express-session');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const path = require('path');
const https = require('https');
const http = require('http');
const emailService = require('./services/emailService');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize database first
const db = require('./database/db');

// View engine setup
app.engine('handlebars', engine({
    defaultLayout: 'main',
    layoutsDir: path.join(__dirname, 'views/layouts'),
    partialsDir: path.join(__dirname, 'views/partials'),
    helpers: {
        eq: function(a, b) {
            return a === b;
        },
        gt: function(a, b) {
            return a > b;
        },
        formatDate: function(dateString) {
            if (!dateString) return 'Never';
            const date = new Date(dateString);
            const now = new Date();
            const diffInMinutes = Math.floor((now - date) / (1000 * 60));
            
            if (diffInMinutes < 1) return 'Just now';
            if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
            
            const diffInHours = Math.floor(diffInMinutes / 60);
            if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
            
            const diffInDays = Math.floor(diffInHours / 24);
            return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
        }
    }
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
app.get('/dashboard', checkDb, async (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }

    try {
        const monitors = await db.getMonitorsByUserId(req.session.user.id);
        res.render('dashboard', {
            user: req.session.user,
            title: 'Dashboard',
            monitors: monitors,
            success: req.session.success || null,
            errors: req.session.errors || []
        });

        delete req.session.success;
        delete req.session.errors;
    } catch (error) {
        console.error('Dashboard error:', error);
        res.render('dashboard', {
            user: req.session.user,
            title: 'Dashboard',
            monitors: [],
            errors: [{ msg: 'Error loading monitors' }]
        });
    }
});

// Monitor routes
function isValidUrl(url) {
    try {
        const parsedUrl = new URL(url);
        return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
    } catch (e) {
        return false;
    }
}

app.post('/monitors', checkDb, async (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }

    try {
        const { name, url, interval } = req.body;
        const errors = [];

        // Validate input
        if (!name || name.trim() === '') {
            errors.push({ msg: 'Monitor name is required' });
        }

        if (!url || url.trim() === '') {
            errors.push({ msg: 'URL is required' });
        } else if (!isValidUrl(url.trim())) {
            errors.push({ msg: 'Please enter a valid URL (http:// or https://)' });
        }

        if (!interval || isNaN(parseInt(interval))) {
            errors.push({ msg: 'Check interval is required' });
        }

        if (errors.length > 0) {
            req.session.errors = errors;
            return res.redirect('/dashboard');
        }

        // Create monitor
        const intervalMinutes = parseInt(interval);
        const monitorId = await db.createMonitor(
            req.session.user.id,
            name.trim(),
            url.trim(),
            intervalMinutes
        );

        // Start monitoring immediately
        performMonitorCheck(monitorId);

        req.session.success = 'Monitor added successfully and monitoring started!';
        res.redirect('/dashboard');

    } catch (error) {
        console.error('Monitor creation error:', error);
        req.session.errors = [{ msg: 'Failed to create monitor. Please try again.' }];
        res.redirect('/dashboard');
    }
});

// Delete monitor route
app.delete('/monitors/:id', checkDb, async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const monitorId = parseInt(req.params.id);
        
        if (isNaN(monitorId)) {
            return res.status(400).json({ error: 'Invalid monitor ID' });
        }

        // Verify the monitor belongs to the current user
        const monitor = await db.getMonitorById(monitorId);
        if (!monitor) {
            return res.status(404).json({ error: 'Monitor not found' });
        }

        if (monitor.user_id !== req.session.user.id) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Delete the monitor
        const deletedCount = await db.deleteMonitor(monitorId, req.session.user.id);
        
        if (deletedCount === 0) {
            return res.status(404).json({ error: 'Monitor not found' });
        }

        res.json({ 
            success: true, 
            message: 'Monitor deleted successfully' 
        });

    } catch (error) {
        console.error('Monitor deletion error:', error);
        res.status(500).json({ error: 'Failed to delete monitor' });
    }
});

// Test email route
app.post('/test-email', checkDb, async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        await emailService.sendTestEmail(req.session.user.email);
        res.json({ 
            success: true, 
            message: 'Test email sent successfully!' 
        });
    } catch (error) {
        console.error('Test email error:', error);
        res.status(500).json({ 
            error: 'Failed to send test email',
            details: error.message 
        });
    }
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

// Monitoring functionality
async function performMonitorCheck(monitorId) {
    try {
        const monitor = await db.getMonitorById(monitorId);
        if (!monitor) {
            console.error('Monitor not found:', monitorId);
            return;
        }

        const url = monitor.url;
        const startTime = Date.now();
        const previousStatus = monitor.status; // Track previous status for email notifications
        
        const requestOptions = {
            timeout: 30000, // 30 second timeout
            headers: {
                'User-Agent': 'Uptime-Kama/1.0'
            }
        };

        const protocol = url.startsWith('https:') ? https : http;
        
        const request = protocol.get(url, requestOptions, async (response) => {
            const endTime = Date.now();
            const responseTime = endTime - startTime;
            const statusCode = response.statusCode;
            const status = (statusCode >= 200 && statusCode < 400) ? 'up' : 'down';
            const errorMessage = status === 'down' ? `HTTP ${statusCode}` : null;

            // Update monitor status
            try {
                await db.updateMonitorStatus(monitorId, status, responseTime, statusCode, errorMessage);
                await db.createMonitorCheck(monitorId, status, responseTime, statusCode, errorMessage);
                
                console.log(`Monitor ${monitor.name} (${monitorId}): ${status.toUpperCase()} - ${responseTime}ms`);
                
                // Send email notification if status changed
                await handleStatusChange(monitor, previousStatus, status, responseTime, errorMessage);
                
            } catch (err) {
                console.error('Error updating monitor status:', err);
            }

            response.on('data', () => {
                // Consume response data to free up memory
            });
        });

        request.on('error', async (error) => {
            const endTime = Date.now();
            const responseTime = endTime - startTime;
            const errorMessage = error.message;

            // Update monitor status
            try {
                await db.updateMonitorStatus(monitorId, 'down', responseTime, null, errorMessage);
                await db.createMonitorCheck(monitorId, 'down', responseTime, null, errorMessage);
                
                console.log(`Monitor ${monitor.name} (${monitorId}): DOWN - ${errorMessage}`);
                
                // Send email notification if status changed
                await handleStatusChange(monitor, previousStatus, 'down', responseTime, errorMessage);
                
            } catch (err) {
                console.error('Error updating monitor status:', err);
            }
        });

        request.on('timeout', async () => {
            request.destroy();
            const endTime = Date.now();
            const responseTime = endTime - startTime;
            const errorMessage = 'Request timeout';

            // Update monitor status
            try {
                await db.updateMonitorStatus(monitorId, 'down', responseTime, null, errorMessage);
                await db.createMonitorCheck(monitorId, 'down', responseTime, null, errorMessage);
                
                console.log(`Monitor ${monitor.name} (${monitorId}): DOWN - ${errorMessage}`);
                
                // Send email notification if status changed
                await handleStatusChange(monitor, previousStatus, 'down', responseTime, errorMessage);
                
            } catch (err) {
                console.error('Error updating monitor status:', err);
            }
        });

        request.setTimeout(30000);

    } catch (error) {
        console.error('Error performing monitor check:', error);
    }
}

// Handle status change and send email notifications
async function handleStatusChange(monitor, previousStatus, newStatus, responseTime, errorMessage) {
    // Only send email if status actually changed
    if (previousStatus === newStatus) {
        return;
    }

    try {
        // Get user email
        const user = await db.getUserById(monitor.user_id);
        if (!user || !user.email) {
            console.log('No user email found for monitor:', monitor.name);
            return;
        }

        const timestamp = new Date().toISOString();
        
        console.log(`📧 Status changed for ${monitor.name}: ${previousStatus || 'unknown'} → ${newStatus}`);
        
        // Send email notification
        await emailService.sendMonitorAlert(
            user.email,
            monitor.name,
            monitor.url,
            newStatus,
            responseTime,
            errorMessage,
            timestamp
        );
        
        console.log(`✅ Email notification sent to ${user.email} for monitor ${monitor.name}`);
        
    } catch (error) {
        console.error('❌ Failed to send email notification:', error.message);
    }
}

// Start monitoring for existing monitors
async function startMonitoring() {
    if (!dbInitialized) return;
    
    try {
        // Get all monitors from database
        const db_instance = db.getDatabase();
        db_instance.all('SELECT * FROM monitors', [], (err, monitors) => {
            if (err) {
                console.error('Error loading monitors for startup:', err);
                return;
            }

            monitors.forEach(monitor => {
                // Set up interval for each monitor
                const intervalMs = monitor.interval_minutes * 60 * 1000;
                setInterval(() => {
                    performMonitorCheck(monitor.id);
                }, intervalMs);

                // Perform initial check
                setTimeout(() => {
                    performMonitorCheck(monitor.id);
                }, 1000);
            });

            console.log(`Started monitoring for ${monitors.length} monitors`);
        });
    } catch (error) {
        console.error('Error starting monitoring:', error);
    }
}

// Start monitoring after database is initialized
setTimeout(() => {
    if (dbInitialized) {
        startMonitoring();
    }
}, 2000);

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