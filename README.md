# Uptime Kama 📊

A lightweight uptime monitoring system built with Node.js and Express. Monitor your websites and services with real-time status updates and email notifications.

## ✨ Features

- **Website Monitoring** - Monitor HTTP/HTTPS endpoints with customizable intervals
- **Real-time Dashboard** - Live status updates without page refresh
- **User Authentication** - Secure signup/login system with session management
- **Email Notifications** - Get notified via email when your sites go down or recover
- **Multiple Check Intervals** - Choose from 1min, 5min, 15min, 30min, or 1hour intervals
- **Response Time Tracking** - Monitor response times for performance insights
- **SQLite Database** - Lightweight, serverless database for data persistence
- **Clean UI** - Modern, responsive interface built with Handlebars

## 🚀 Quick Start

### Prerequisites

- Node.js
- npm

### Installation

1. Install dependencies:
```bash
npm install
```

1. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

### Environment Variables

Create a `.env` file in the root directory:

```env
# Application
PORT=3000
SESSION_SECRET=your-session-secret-key

# SMTP Email Configuration (Optional)
SMTP_HOST=smtp.eu.mailgun.org
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=up@up.bee-srv.me
SMTP_PASS=your-smtp-password
EMAIL_FROM=up@up.bee-srv.me
EMAIL_FROM_NAME=Status Monitor
```

### Testing SMTP Configuration

To test your SMTP email configuration:

```bash
# Test with default email
npm run test:smtp

# Test with specific email
node test-smtp.js your-email@example.com
```