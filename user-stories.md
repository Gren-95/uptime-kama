# MVP User Stories - Uptime Monitor

## Story 0.1: Account Creation
**As a** new user  
**I want** to create an account with email and password  
**So that** I can access the monitoring system

**Acceptance Criteria:**
- I can enter my email address and password
- Email must be valid format
- Password must be at least 8 characters
- I get an error if email is already registered
- I get an error if passwords don't match
- I am automatically logged in after successful signup
- I am redirected to the dashboard after signup

## Story 0.2: User Login
**As a** registered user  
**I want** to log in to my account  
**So that** I can access my monitoring dashboard

**Acceptance Criteria:**
- I can enter my email and password to log in
- I get an error message if my credentials are wrong
- I am redirected to my dashboard after successful login
- I can log out of my account
- I am redirected to login page after logout
- I stay logged in when I refresh the page

## Story 1.1: Add Website Monitor
**As a** user  
**I want** to add a website URL to monitor  
**So that** I can track if my website is up or down

**Acceptance Criteria:**
- I can enter a website URL (http/https)
- I can give the monitor a friendly name
- I can choose how often to check it (1min, 5min, 15min, 30min, 1hour)
- The monitor starts checking immediately after I save it
- I see a confirmation that the monitor was added

## Story 1.2: View Monitor Dashboard
**As a** user  
**I want** to see all my monitors on a dashboard  
**So that** I can quickly see which websites are up or down

**Acceptance Criteria:**
- I see a list of all my monitors
- Each monitor shows UP (green) or DOWN (red) status
- I can see the monitor name and URL
- I can see when it was last checked
- I can see the response time for UP monitors
- The page updates automatically without refresh

## Story 1.3: Delete Monitor
**As a** user  
**I want** to remove monitors I no longer need  
**So that** I can keep my dashboard clean

**Acceptance Criteria:**
- I can delete a monitor from the dashboard
- I get a confirmation before deletion
- The monitor stops checking after deletion
- It's removed from my dashboard immediately

## Story 2.1: Email Notifications
**As a** user  
**I want** to receive email alerts when my websites go down  
**So that** I can respond to outages quickly

**Acceptance Criteria:**
- I can set my email address for notifications
- I receive an email when a monitor goes from UP to DOWN
- I receive an email when a monitor recovers from DOWN to UP
- The email includes monitor name, URL, and timestamp
- I can turn email notifications on/off per monitor