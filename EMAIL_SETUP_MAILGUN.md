# Email Notifications Setup - Mailgun

This guide shows you how to configure email notifications using Mailgun API.

## 🔒 Security First

**NEVER put API keys in code files!** Always use environment variables in the `.env` file.

## Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Uptime Kama   │───▶│   Mailgun API   │───▶│  efemarko1@     │
│   Application   │    │                 │    │   gmail.com     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

- **Uptime Kama** sends emails directly via Mailgun API
- **Mailgun** delivers emails to recipients
- **Simple & Reliable** - no SMTP configuration needed

## Quick Setup

### Step 1: Get Mailgun Domain

You already have an API key, now you need a domain:

1. Go to [Mailgun Domains](https://app.mailgun.com/app/domains)
2. You'll see a **sandbox domain** (looks like `sandbox123abc.mailgun.org`)
3. Use this for testing - it's already configured!
4. Copy the domain name

### Step 2: Configure Environment Variables

Edit your `.env` file:
```bash
# Mailgun API Configuration
MAILGUN_API_KEY=d47815134e3849a72a6a508c45b520cf-5bb33252-e227c200
MAILGUN_DOMAIN=sandbox123abc.mailgun.org  # Your sandbox domain
EMAIL_FROM=noreply@sandbox123abc.mailgun.org

# Set to production for real emails
NODE_ENV=production
```

### Step 3: Test Email System

```bash
# Test Mailgun functionality
npm run test:mailgun

# Start the monitoring application
npm start
```

## Email System Modes

### 🧪 Development Mode (Mock Emails)
```bash
# In .env file:
NODE_ENV=development
MAILGUN_DOMAIN=    # Leave empty

# Start app:
npm start
```
- Emails logged to console only
- No real emails sent
- Safe for development

### 📧 Production Mode (Real Emails via Mailgun)
```bash
# In .env file:
NODE_ENV=production
MAILGUN_API_KEY=d47815134e3849a72a6a508c45b520cf-5bb33252-e227c200
MAILGUN_DOMAIN=sandbox123abc.mailgun.org
EMAIL_FROM=noreply@sandbox123abc.mailgun.org

# Start app:
npm start
```
- Real emails sent through Mailgun API
- All monitor alerts go to efemarko1@gmail.com

## Testing Email Functionality

### 1. Test Mailgun Connection
```bash
# Test Mailgun API directly
npm run test:mailgun
```

### 2. Test Monitor Alerts
1. Create a monitor with URL: `https://httpstat.us/500` (always fails)
2. Wait 1-2 minutes for the check
3. Check your email for DOWN alert
4. Edit monitor URL to: `https://httpstat.us/200` (always works)
5. Wait for UP recovery email

### 3. Test Email Endpoint
```bash
# While app is running, test email endpoint
curl -X POST http://localhost:3000/test-email \
  -H "Cookie: connect.sid=your-session-cookie"
```

## Configuration Examples

### Using Sandbox Domain (Recommended for Testing)
```bash
# Get this from https://app.mailgun.com/app/domains
MAILGUN_DOMAIN=sandbox123abc.mailgun.org
EMAIL_FROM=noreply@sandbox123abc.mailgun.org
```

### Using Your Own Domain (Production)
```bash
# After adding your domain to Mailgun
MAILGUN_DOMAIN=your-domain.com
EMAIL_FROM=noreply@your-domain.com
```

## Mailgun Dashboard

Monitor your emails at https://app.mailgun.com/app/logs:

- **Delivered**: Emails successfully sent
- **Failed**: Failed deliveries with reasons
- **Opened**: Email open tracking (if enabled)
- **Clicked**: Link click tracking (if enabled)

## Environment Variables Reference

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `MAILGUN_API_KEY` | Yes | Your Mailgun API key | `d47815...` |
| `MAILGUN_DOMAIN` | Yes | Your Mailgun domain | `sandbox123.mailgun.org` |
| `EMAIL_FROM` | Optional | From email address | `noreply@sandbox123.mailgun.org` |
| `NODE_ENV` | Optional | Environment mode | `production` for real emails |

## Troubleshooting

### API Key Issues
```bash
# Check if API key works
npm run test:mailgun

# Common errors:
# - "Forbidden" = Wrong API key
# - "Domain not found" = Wrong domain
```

### Domain Issues
1. **Get your sandbox domain**: https://app.mailgun.com/app/domains
2. **Copy exactly** including `sandbox` prefix
3. **Use `.mailgun.org`** extension

### No Emails Received
```bash
# Check Mailgun logs
# https://app.mailgun.com/app/logs

# Check application logs
npm start
```

### Sandbox Limitations
- Sandbox domains can only send to **authorized recipients**
- Add `efemarko1@gmail.com` to authorized recipients:
  1. Go to https://app.mailgun.com/app/domains
  2. Click your sandbox domain
  3. Add authorized recipient

## Adding Your Own Domain (Optional)

For production use, you can add your own domain:

1. Go to https://app.mailgun.com/app/domains
2. Click "Add New Domain"
3. Enter your domain (e.g., `your-domain.com`)
4. Follow DNS setup instructions
5. Wait for verification
6. Update `.env` with your domain

## Email Flow Diagram

```
1. Monitor Status Change Detected
        ↓
2. App calls Mailgun API
        ↓
3. Mailgun processes email
        ↓
4. Email delivered to efemarko1@gmail.com
        ↓
5. Email appears in inbox
```

## Security Notes

✅ **Good Practices:**
- Use `.env` file for API keys (never commit to git)
- Use sandbox domain for testing
- Monitor Mailgun usage and logs
- Keep API keys secure

❌ **Never Do:**
- Put API keys in code files
- Commit `.env` file to version control
- Share API keys in chat/email
- Use production domain for testing

## Email Templates

Monitor alerts include:

### 🚨 DOWN Alert
- **Subject**: `🚨 Monitor Name is DOWN`
- **Styling**: Red header, error details
- **Content**: URL, response time, error message, timestamp

### ✅ UP Alert  
- **Subject**: `🚨 Monitor Name is UP`
- **Styling**: Green header, recovery confirmation
- **Content**: URL, response time, timestamp

## Package Dependencies

The following packages are used:
- `mailgun.js` - Official Mailgun JavaScript SDK
- `form-data` - Required by Mailgun SDK
- `dotenv` - Environment variable management

## Quick Commands

```bash
# Test Mailgun email
npm run test:mailgun

# Start with email notifications
npm start

# Check configuration
cat .env | grep MAILGUN
```

## Helpful Links

- [Mailgun Dashboard](https://app.mailgun.com/app/dashboard)
- [Email Logs](https://app.mailgun.com/app/logs)
- [Domain Management](https://app.mailgun.com/app/domains)
- [API Documentation](https://documentation.mailgun.com/api_reference.html)
- [Account Settings](https://app.mailgun.com/app/account/security) 