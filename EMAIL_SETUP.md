# Email Notifications Setup (Secure)

This guide shows you how to configure email notifications securely without exposing your passwords.

## 🔒 Security First

**NEVER put passwords in code files or scripts!** Always use environment variables.

## Quick Setup for Testing

### Option 1: Mock Email (Safest - No real emails)
```bash
# Just run normally - emails will be logged to console
npm start
```

### Option 2: Real Gmail Testing (Requires Gmail App Password)
```bash
# Set environment variables securely (one-time setup)
export SMTP_USER=efemarko1@gmail.com
export SMTP_PASS=your-gmail-app-password-here
export SMTP_HOST=smtp.gmail.com
export SMTP_PORT=587
export NODE_ENV=production

# Start the app
npm start
```

## How Email Notifications Work

### 📧 **All Monitor Alerts Go to Your Email**
- The system is configured to send **ALL** monitor notifications to `efemarko1@gmail.com`
- When any monitor goes UP or DOWN, you'll receive an email
- Beautiful HTML emails with status colors and details

### 🔄 **Status Change Detection**
- System tracks previous status vs current status
- Only sends emails when status actually changes (UP→DOWN or DOWN→UP)
- Includes response time, error details, and timestamps

## Gmail Setup (Secure Method)

### 1. Enable Gmail App Passwords
1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable **2-Factor Authentication** (required)
3. Go to **App passwords**
4. Generate a new app password for "Mail"
5. Copy the 16-character password (looks like: `abcd efgh ijkl mnop`)

### 2. Set Environment Variables (Secure)
```bash
# In your terminal (replace with your actual app password):
export SMTP_USER=efemarko1@gmail.com
export SMTP_PASS=abcd-efgh-ijkl-mnop  # Your Gmail app password
export NODE_ENV=production

# Start the application
npm start
```

### 3. Test Email Functionality
```bash
# Test email endpoint (while app is running)
curl -X POST http://localhost:3000/test-email \
  -H "Cookie: connect.sid=your-session-cookie"

# Or create a monitor that will fail to test alerts
```

## Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `SMTP_USER` | For real emails | Your Gmail address | `efemarko1@gmail.com` |
| `SMTP_PASS` | For real emails | Gmail app password | `abcd-efgh-ijkl-mnop` |
| `SMTP_HOST` | Optional | SMTP server | `smtp.gmail.com` (default) |
| `SMTP_PORT` | Optional | SMTP port | `587` (default) |
| `NODE_ENV` | Optional | Environment | `production` for real emails |

## Testing Monitor Alerts

### 1. Create a Test Monitor
1. Start the app: `npm start`
2. Go to: http://localhost:3000
3. Create a monitor with URL: `https://httpstat.us/500` (always fails)
4. Wait 1-2 minutes for the check
5. Check your email for DOWN alert

### 2. Create Recovery Test
1. Edit the monitor URL to: `https://httpstat.us/200` (always works)
2. Wait for the check
3. You'll receive an UP recovery email

## Email Template Examples

### 🚨 DOWN Alert
```
Subject: 🚨 Test Monitor is DOWN

Monitor Alert - Test Monitor

Status: DOWN
URL: https://httpstat.us/500
Response Time: 1250ms
Error: HTTP 500
Timestamp: 2025-06-09T12:45:30.123Z

Your monitor is currently down. We will continue checking 
and notify you when it recovers.
```

### ✅ UP Recovery
```
Subject: 🚨 Test Monitor is UP

Monitor Alert - Test Monitor

Status: UP
URL: https://httpstat.us/200
Response Time: 245ms
Timestamp: 2025-06-09T12:47:15.456Z

Your monitor has recovered and is now up!
```

## Troubleshooting

### No Emails Received
1. **Check Environment Variables**:
   ```bash
   echo $SMTP_USER
   echo $SMTP_PASS
   echo $NODE_ENV
   ```

2. **Check Application Logs**:
   - Look for `📧 Using REAL email service for production`
   - Look for `✅ Email sent successfully to efemarko1@gmail.com`

3. **Check Gmail**:
   - Check spam/junk folder
   - Verify app password is correct
   - Ensure 2FA is enabled

### Mock Emails Instead of Real Ones
- Make sure `NODE_ENV=production` is set
- If `NODE_ENV` is not set, system uses mock emails

### Authentication Errors
```
❌ Failed to send email: Invalid login
```
- Double-check Gmail app password
- Ensure 2FA is enabled on Google account
- Try generating a new app password

## Security Notes

✅ **Good Practices:**

- Use environment variables for credentials
- Use Gmail app passwords (not your regular password)
- Keep environment variables in your shell session only

❌ **Never Do:**

- Put passwords in code files
- Commit credentials to version control
- Share environment variables in chat/email
- Use your regular Gmail password

## Quick Commands

```bash
# Secure start with Gmail
export SMTP_USER=efemarko1@gmail.com SMTP_PASS=your-app-password NODE_ENV=production && npm start

# Mock email testing (safe)
npm start

# Check if environment is set
env | grep SMTP
``` 