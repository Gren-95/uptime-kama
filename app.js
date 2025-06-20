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

// Settings route
app.get('/settings', checkDb, async (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }

    try {
        const user = await db.getUserById(req.session.user.id);
        
        // Pre-fill notification email with user's email if not set
        if (!user.notification_email) {
            user.notification_email = user.email;
        }
        
        res.render('settings', {
            user: user,
            title: 'Settings',
            success: req.session.success || null,
            errors: req.session.errors || [],
            // Template preview variables - showing literal template syntax
            monitorNameTemplate: '{{monitorName}}',
            monitorUrlTemplate: '{{monitorUrl}}',
            statusTemplate: '{{status}}',
            timestampTemplate: '{{timestamp}}'
        });

        delete req.session.success;
        delete req.session.errors;
    } catch (error) {
        console.error('Settings error:', error);
        res.render('settings', {
            user: req.session.user,
            title: 'Settings',
            errors: [{ msg: 'Error loading settings' }],
            // Template preview variables - showing literal template syntax
            monitorNameTemplate: '{{monitorName}}',
            monitorUrlTemplate: '{{monitorUrl}}',
            statusTemplate: '{{status}}',
            timestampTemplate: '{{timestamp}}'
        });
    }
});

// Update email settings
app.post('/settings/email', checkDb, async (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }

    try {
        const { notificationEmail, enableEmailNotifications } = req.body;
        const errors = [];

        // Validate notification email if provided
        if (notificationEmail && notificationEmail.trim() !== '') {
            if (!isValidEmail(notificationEmail.trim())) {
                errors.push({ msg: 'Please enter a valid email address' });
            }
        }

        if (errors.length > 0) {
            req.session.errors = errors;
            return res.redirect('/settings');
        }

        // Update user email settings
        await db.updateUserEmailSettings(
            req.session.user.id,
            notificationEmail ? notificationEmail.trim() : null,
            enableEmailNotifications === 'on' ? 1 : 0
        );

        req.session.success = 'Notification settings saved';
        res.redirect('/settings');

    } catch (error) {
        console.error('Email settings update error:', error);
        req.session.errors = [{ msg: 'Failed to update email settings. Please try again.' }];
        res.redirect('/settings');
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
        const { name, url, interval, emailNotifications } = req.body;
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
        const emailNotificationsEnabled = emailNotifications === 'on' ? 1 : 0;
        const monitorId = await db.createMonitor(
            req.session.user.id,
            name.trim(),
            url.trim(),
            intervalMinutes,
            emailNotificationsEnabled
        );

        // Start monitoring immediately and set up recurring checks
        performMonitorCheck(monitorId);
        setupMonitorInterval(monitorId, intervalMinutes);

        req.session.success = 'Monitor added successfully and monitoring started!';
        res.redirect('/dashboard');

    } catch (error) {
        console.error('Monitor creation error:', error);
        req.session.errors = [{ msg: 'Failed to create monitor. Please try again.' }];
        res.redirect('/dashboard');
    }
});

// Edit monitor route
app.put('/monitors/:id', checkDb, async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const monitorId = parseInt(req.params.id);
        const { name, url, interval, emailNotifications } = req.body;
        
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

        // Validate input
        const errors = [];
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
            return res.status(400).json({ errors: errors });
        }

        // Update monitor
        const intervalMinutes = parseInt(interval);
        const emailNotificationsEnabled = emailNotifications === 'on' ? 1 : 0;
        
        await db.updateMonitor(
            monitorId,
            name.trim(),
            url.trim(), 
            intervalMinutes,
            emailNotificationsEnabled
        );

        // Update monitoring interval if it changed
        setupMonitorInterval(monitorId, intervalMinutes);

        res.json({ 
            success: true, 
            message: 'Monitor updated successfully' 
        });

    } catch (error) {
        console.error('Monitor update error:', error);
        res.status(500).json({ error: 'Failed to update monitor' });
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

        // Clear monitoring interval and delete the monitor
        clearMonitorInterval(monitorId);
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

// Store monitor intervals so they can be cleared
const monitorIntervals = new Map();

// Set up monitoring interval for a specific monitor
function setupMonitorInterval(monitorId, intervalMinutes) {
    // Clear existing interval if it exists
    if (monitorIntervals.has(monitorId)) {
        clearInterval(monitorIntervals.get(monitorId));
    }
    
    // Set up new interval
    const intervalMs = intervalMinutes * 60 * 1000;
    const intervalId = setInterval(() => {
        performMonitorCheck(monitorId);
    }, intervalMs);
    
    monitorIntervals.set(monitorId, intervalId);
    console.log(`Set up monitoring interval for monitor ${monitorId}: every ${intervalMinutes} minutes`);
}

// Clear monitoring interval for a specific monitor
function clearMonitorInterval(monitorId) {
    if (monitorIntervals.has(monitorId)) {
        clearInterval(monitorIntervals.get(monitorId));
        monitorIntervals.delete(monitorId);
        console.log(`Cleared monitoring interval for monitor ${monitorId}`);
    }
}

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
        console.log(`🔕 No email sent for ${monitor.name}: Status unchanged (${newStatus})`);
        return;
    }

    try {
        // Get user and check email notification preferences
        const user = await db.getUserById(monitor.user_id);
        if (!user) {
            console.log('User not found for monitor:', monitor.name);
            return;
        }

        // Check if email notifications are enabled globally
        if (!user.enable_email_notifications) {
            console.log(`Email notifications disabled globally for user ${user.email}`);
            return;
        }

        // Check if email notifications are enabled for this specific monitor
        if (!monitor.email_notifications) {
            console.log(`Email notifications disabled for monitor: ${monitor.name}`);
            return;
        }

        // Determine which email to send to
        const recipientEmail = user.notification_email || user.email;
        if (!recipientEmail) {
            console.log('No notification email found for monitor:', monitor.name);
            return;
        }

        const timestamp = new Date().toISOString();
        
        console.log(`📧 Status changed for ${monitor.name}: ${previousStatus || 'unknown'} → ${newStatus}`);
        
        // Send email notification
        await emailService.sendMonitorAlert(
            recipientEmail,
            monitor.name,
            monitor.url,
            newStatus,
            responseTime,
            errorMessage,
            timestamp
        );
        
        console.log(`✅ Email notification sent to ${recipientEmail} for monitor ${monitor.name}`);
        
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
                setupMonitorInterval(monitor.id, monitor.interval_minutes);

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