# Email Verification Auto-Reload Implementation

This document describes the implementation of automatic page reload functionality when email verification is completed on another device.

## Overview

When a user creates a new account and needs to verify their email, the system now automatically detects when the verification is completed on another device and reloads the current page to complete the authentication process.

## Implementation Details

### Frontend Components

#### 1. Email Verification Hook (`lib/hooks/useEmailVerification.ts`)
- Custom React hook that polls for email verification status
- Configurable polling interval (default: 3 seconds)
- Handles session updates when verification is complete
- Supports email-specific verification checks

#### 2. API Endpoint (`app/api/auth/check-verification/route.ts`)
- RESTful endpoint to check verification status
- Integrates with Keycloak admin API
- Supports both token-based and email-based verification checks
- Returns verification status as JSON

#### 3. Enhanced Signin Page (`app/auth/signin/page.tsx`)
- Detects email verification mode via URL parameters
- Shows verification status message with user's email
- Displays polling status and error messages
- Listens for messages from Keycloak iframe/popup

### Keycloak Integration

#### 1. Enhanced Email Verification Template (`keycloak/themes/unipages/login/login-verify-email.ftl`)
- Added JavaScript for auto-reload functionality
- Detects if running in iframe or popup context
- Polls Keycloak for verification status
- Sends messages to parent window when verification completes
- Handles both iframe and popup scenarios

## Usage

### URL Parameters
The signin page accepts the following parameters for email verification mode:

- `email_verification=true` - Enables verification mode
- `email=user@example.com` - User's email address to check
- `callbackUrl=/path` - URL to redirect to after verification

### Example URLs
```
/auth/signin?email_verification=true&email=user@example.com
/auth/signin?email_verification=true&email=user@example.com&callbackUrl=/admin
```

### Testing
A test page is available at `/test-verification` to demonstrate the functionality.

## How It Works

1. **User Registration**: User creates account and is redirected to email verification
2. **Verification Page**: Keycloak shows verification page with auto-reload JavaScript
3. **Polling**: Both frontend and Keycloak page poll for verification status
4. **Detection**: When verification is detected, the page automatically reloads
5. **Authentication**: User is automatically authenticated and redirected

## Configuration

### Environment Variables
Ensure the following environment variables are set:

```env
KEYCLOAK_ISSUER=https://your-keycloak.com/realms/your-realm
KEYCLOAK_ADMIN_CLIENT_ID=admin-cli
KEYCLOAK_ADMIN_CLIENT_SECRET=your-admin-secret
KEYCLOAK_ID=nextjs-app
```

### Keycloak Theme Properties
Add the following property to your Keycloak theme:

```properties
frontendUrl=http://localhost:3000
```

## Security Considerations

- Verification checks are performed server-side using Keycloak admin API
- Tokens are validated before considering verification complete
- Email verification status is checked against actual user records
- Cross-origin messaging is restricted to prevent security issues

## Troubleshooting

### Common Issues

1. **Polling not starting**: Check if `email_verification=true` parameter is present
2. **Verification not detected**: Ensure Keycloak admin credentials are correct
3. **Page not reloading**: Check browser console for JavaScript errors
4. **Cross-origin issues**: Verify frontend URL is correctly configured in Keycloak

### Debug Mode
Enable debug logging by setting `NODE_ENV=development` in your environment.

## Future Enhancements

- WebSocket support for real-time verification updates
- Push notifications for verification completion
- Custom verification timeout handling
- Multi-device verification status tracking
