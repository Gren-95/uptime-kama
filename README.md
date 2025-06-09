# Uptime Kama 📊

A modern, self-hosted uptime monitoring system built with Node.js, Express, and Handlebars. Monitor your websites, services, and APIs with real-time alerts and beautiful dashboards.

## ✨ Features

### 🔐 User Management
- **Account Creation & Authentication** - Secure user registration and login
- **Role-Based Access Control** - Admin, Editor, and Viewer roles
- **Two-Factor Authentication** - Enhanced security with 2FA support
- **API Key Management** - Generate and manage API keys for integrations

### 📈 Monitoring Capabilities
- **HTTP/HTTPS Monitoring** - Monitor websites and web services
- **TCP Port Monitoring** - Check if specific ports are accessible
- **Ping/ICMP Checks** - Network connectivity monitoring
- **DNS Resolution** - Monitor DNS response times
- **SSL Certificate Monitoring** - Track certificate expiration
- **Database Monitoring** - MySQL, PostgreSQL connection checks
- **Docker Container Monitoring** - Container health checks

### 🎛️ Dashboard & Visualization
- **Real-time Dashboard** - Live status updates via WebSocket
- **Historical Data** - Uptime charts and performance trends
- **Response Time Graphs** - Visualize performance over time
- **Incident Timeline** - Track downtime events and recovery
- **Search & Filtering** - Organize monitors with tags and groups

### 🚨 Alerts & Notifications
- **Multiple Channels** - Email, Slack, Discord, Telegram, Webhooks
- **Smart Alert Rules** - Configurable escalation and quiet hours
- **Alert Management** - Acknowledge alerts and set maintenance windows
- **Custom Templates** - Personalized notification messages

### 📊 Status Pages
- **Public Status Pages** - Share service status with users
- **Custom Branding** - Upload logos and customize appearance
- **Incident Communication** - Post updates and maintenance notices
- **Responsive Design** - Mobile-friendly status pages

### 📋 Reporting & Analytics
- **Uptime Reports** - Generate SLA compliance reports
- **Performance Analytics** - Response time trends and percentiles
- **Data Export** - CSV and PDF report formats
- **Historical Data Management** - Configurable retention policies

## 🚀 Quick Start

### Prerequisites
- Node.js 16.x or higher
- npm or yarn package manager
- SQLite (default) or PostgreSQL/MySQL

### Installation

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Initialize the database**
   ```bash
   npm run db:migrate
   ```

4. **Start the application**
   ```bash
   npm start
   ```

5. **Access the application**
   Open your browser and navigate to `http://localhost:3000`

### Environment Variables

Create a `.env` file in the root directory:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration
DB_TYPE=sqlite
DB_HOST=localhost
DB_PORT=5432
DB_NAME=uptime_kama
DB_USER=your_username
DB_PASS=your_password

# Session Configuration
SESSION_SECRET=your-secret-key-here

# Email Configuration (for notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Notification Webhooks
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
```

## 🧪 Testing

This project includes comprehensive end-to-end tests using Playwright.

### Running Tests

```bash
# Install Playwright browsers (first time only)
npx playwright install

# Run all tests
npm test

# Run tests with UI mode
npm run test:ui

# Run tests in headed mode (visible browser)
npm run test:headed

# Debug tests
npm run test:debug

# View test reports
npm run test:report
```

### Test Coverage

- ✅ Account creation and validation
- ✅ User authentication flow
- ✅ Monitor creation and configuration
- ✅ Dashboard functionality
- ✅ Alert system
- ✅ Status page generation
- ✅ API endpoints

## 🛠️ Development

### Project Structure

```
uptime-kama/
├── app.js                 # Main application entry point
├── routes/               # Express route handlers
│   ├── auth.js          # Authentication routes
│   ├── monitors.js      # Monitor management
│   ├── dashboard.js     # Dashboard routes
│   └── api/             # API endpoints
├── views/               # Handlebars templates
│   ├── layouts/         # Page layouts
│   ├── partials/        # Reusable components
│   └── pages/           # Page templates
├── public/              # Static assets
│   ├── css/            # Stylesheets
│   ├── js/             # Client-side JavaScript
│   └── images/         # Images and icons
├── lib/                # Core functionality
│   ├── monitors/       # Monitoring logic
│   ├── notifications/  # Alert system
│   └── database/       # Database models
├── tests/              # Test files
│   ├── account-creation.spec.js
│   └── test-utils.js
└── config/             # Configuration files
```

### Available Scripts

```bash
# Development with hot reload
npm run dev

# Start production server
npm start

# Run database migrations
npm run db:migrate

# Seed database with sample data
npm run db:seed

# Run linting
npm run lint

# Format code
npm run format

# Build for production
npm run build
```

### Adding New Monitor Types

1. Create a new monitor class in `lib/monitors/`
2. Implement the required interface methods
3. Register the monitor type in the monitor factory
4. Add UI components in the views
5. Write tests for the new monitor type

Example monitor implementation:

```javascript
// lib/monitors/HttpMonitor.js
class HttpMonitor {
  constructor(config) {
    this.config = config;
  }

  async check() {
    // Implement monitoring logic
    return {
      status: 'up', // or 'down'
      responseTime: 150,
      statusCode: 200,
      message: 'OK'
    };
  }
}
```

### Database Schema

The application uses the following main tables:
- `users` - User accounts and authentication
- `monitors` - Monitor configurations
- `monitor_checks` - Historical check results
- `incidents` - Downtime incidents
- `notifications` - Alert configurations
- `status_pages` - Public status page settings

## 🚀 Deployment

### Docker Deployment

```bash
# Build Docker image
docker build -t uptime-kama .

# Run with Docker Compose
docker-compose up -d
```

### Manual Deployment

1. **Prepare the server**
   ```bash
   # Update system packages
   sudo apt update && sudo apt upgrade -y
   
   # Install Node.js
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

2. **Deploy the application**
   ```bash
   # Clone and install
   git clone <repository-url>
   cd uptime-kama
   npm ci --production
   
   # Set up environment
   cp .env.example .env
   # Edit .env with production values
   
   # Run database migrations
   npm run db:migrate
   ```

3. **Set up process manager**
   ```bash
   # Install PM2
   npm install -g pm2
   
   # Start the application
   pm2 start app.js --name uptime-kama
   
   # Save PM2 configuration
   pm2 save
   pm2 startup
   ```

### Environment-Specific Configuration

- **Development**: SQLite database, verbose logging
- **Production**: PostgreSQL/MySQL, optimized logging, SSL enabled
- **Testing**: In-memory database, mock notifications

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Write or update tests
5. Ensure all tests pass (`npm test`)
6. Commit your changes (`git commit -m 'Add amazing feature'`)
7. Push to the branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

### Code Style

- Use ESLint and Prettier for code formatting
- Follow the existing code structure and naming conventions
- Write meaningful commit messages
- Include tests for new features

## 📝 API Documentation

### Authentication

All API endpoints require authentication via API key or session.

```bash
# Include API key in header
curl -H "X-API-Key: your-api-key" http://localhost:3000/api/monitors
```

### Monitor Management

```bash
# Get all monitors
GET /api/monitors

# Create new monitor
POST /api/monitors
{
  "name": "My Website",
  "type": "http",
  "url": "https://example.com",
  "interval": 300
}

# Update monitor
PUT /api/monitors/:id

# Delete monitor
DELETE /api/monitors/:id
```

### Status Information

```bash
# Get monitor status
GET /api/monitors/:id/status

# Get uptime statistics
GET /api/monitors/:id/uptime?period=30d
```

## 🐛 Troubleshooting

### Common Issues

**Database connection errors**
- Check database credentials in `.env`
- Ensure database server is running
- Verify network connectivity

**Monitor checks failing**
- Check firewall settings
- Verify DNS resolution
- Test connectivity manually

**Notifications not working**
- Verify webhook URLs and credentials
- Check notification channel configuration
- Review application logs for errors

### Logging

Application logs are available in:
- Development: Console output
- Production: `logs/app.log`
- Error logs: `logs/error.log`

Enable debug logging:
```bash
DEBUG=uptime-kama:* npm start
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by [Uptime Kuma](https://github.com/louislam/uptime-kuma)
- Built with [Express.js](https://expressjs.com/)
- UI components from [Bootstrap](https://getbootstrap.com/)
- Testing with [Playwright](https://playwright.dev/)

## 📞 Support

- 📖 [Documentation](https://github.com/your-username/uptime-kama/wiki)
- 🐛 [Issue Tracker](https://github.com/your-username/uptime-kama/issues)
- 💬 [Discussions](https://github.com/your-username/uptime-kama/discussions)

---

**Made with ❤️ by the Uptime Kama team** 