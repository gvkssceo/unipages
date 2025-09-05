# Dynamic Left Side Content - Unipages Keycloak Theme

## Overview

The Unipages Keycloak theme now features dynamic left-side content that changes based on the page type/role. This provides a more contextual and engaging user experience across all authentication flows.

## Page-Specific Content

### 🔐 Authentication Pages

#### **Login Page** (`login`)
- **Title**: "Welcome Back"
- **Description**: "Sign in to your Unipages account to access your personalized dashboard and manage your academic journey."

#### **Registration Page** (`register`)
- **Title**: "Join Unipages"
- **Description**: "Create your account and start your educational journey with Unipages. Connect with students, instructors, and resources."

#### **Password Reset** (`login-reset-password`)
- **Title**: "Reset Password"
- **Description**: "Don't worry! Enter your email address and we'll send you a link to reset your password securely."

#### **Update Password** (`login-update-password`)
- **Title**: "Update Password"
- **Description**: "For your security, please update your password. Choose a strong password to keep your account safe."

#### **Profile Update** (`login-update-profile`)
- **Title**: "Complete Profile"
- **Description**: "Help us personalize your experience by completing your profile information. This helps us provide better services."

### 🔒 Security & Verification

#### **Email Verification** (`login-verify-email`)
- **Title**: "Verify Email"
- **Description**: "We've sent a verification link to your email. Please check your inbox and click the link to verify your account."

#### **Two-Factor Authentication** (`login-otp`)
- **Title**: "Two-Factor Authentication"
- **Description**: "Enter the verification code from your authenticator app to complete the login process securely."

#### **Setup 2FA** (`login-config-totp`)
- **Title**: "Setup Two-Factor Auth"
- **Description**: "Enhance your account security by setting up two-factor authentication. Scan the QR code with your authenticator app."

#### **Security Key Authentication** (`webauthn-authenticate`)
- **Title**: "Security Key"
- **Description**: "Use your security key or biometric authentication to sign in securely to your Unipages account."

#### **Register Security Key** (`webauthn-register`)
- **Title**: "Register Security Key"
- **Description**: "Set up a security key for passwordless authentication. This provides the highest level of security for your account."

#### **Passkeys** (`passkeys`)
- **Title**: "Passkeys"
- **Description**: "Use passkeys for a secure, passwordless sign-in experience. Your device will handle the authentication seamlessly."

### 🔄 Recovery & Management

#### **Recovery Codes Setup** (`login-recovery-authn-code-config`)
- **Title**: "Recovery Codes"
- **Description**: "Generate recovery codes to access your account if you lose your authentication device. Keep these codes safe and secure."

#### **Recovery Code Input** (`login-recovery-authn-code-input`)
- **Title**: "Recovery Code"
- **Description**: "Enter one of your recovery codes to access your account. Each code can only be used once."

#### **Reset OTP** (`login-reset-otp`)
- **Title**: "Reset OTP"
- **Description**: "Reset your OTP configuration to set up a new authenticator app or device for two-factor authentication."

### 🔗 Social & External Authentication

#### **OAuth Grant** (`login-oauth-grant`)
- **Title**: "Application Access"
- **Description**: "An application is requesting access to your account. Review the permissions and grant access if you trust this application."

#### **Device Verification** (`login-oauth2-device-verify-user-code`)
- **Title**: "Device Verification"
- **Description**: "Enter the code displayed on your device to complete the authentication process and access your account."

#### **Link Social Account** (`login-idp-link-confirm`)
- **Title**: "Link Account"
- **Description**: "Link your social media account to your Unipages profile for easier sign-in and enhanced features."

#### **Social Email Verification** (`login-idp-link-email`)
- **Title**: "Verify Email"
- **Description**: "We need to verify your email address before linking your social media account to your Unipages profile."

#### **Account Link Override** (`login-idp-link-confirm-override`)
- **Title**: "Account Link"
- **Description**: "An account with this email already exists. Choose how you'd like to proceed with linking your accounts."

#### **Review Social Profile** (`login-idp-review-user-profile`)
- **Title**: "Review Profile"
- **Description**: "Review and update your profile information from your social media account before completing the sign-in process."

### 🎯 Selection & Configuration

#### **Authenticator Selection** (`select-authenticator`)
- **Title**: "Choose Authentication"
- **Description**: "Select your preferred authentication method to continue with the sign-in process securely."

#### **Organization Selection** (`select-organization`)
- **Title**: "Select Organization"
- **Description**: "Choose your organization or institution to access the appropriate resources and features."

### 📝 Account Management

#### **Update Email** (`update-email`)
- **Title**: "Update Email"
- **Description**: "Update your email address to ensure you receive important notifications and can access your account."

#### **Terms of Service** (`terms`)
- **Title**: "Terms of Service"
- **Description**: "Please review and accept our terms of service to continue using Unipages and its features."

#### **Delete Account** (`delete-account-confirm`)
- **Title**: "Delete Account"
- **Description**: "Are you sure you want to delete your account? This action cannot be undone and will permanently remove all your data."

#### **Remove Credential** (`delete-credential`)
- **Title**: "Remove Credential"
- **Description**: "Remove a security credential from your account. This will disable the associated authentication method."

### 🚪 Session Management

#### **Session Expired** (`login-page-expired`)
- **Title**: "Session Expired"
- **Description**: "Your session has expired for security reasons. Please sign in again to continue accessing your account."

#### **Front-channel Logout** (`frontchannel-logout`)
- **Title**: "Sign Out"
- **Description**: "You have been signed out from all applications. Thank you for using Unipages!"

#### **Logout Confirmation** (`logout-confirm`)
- **Title**: "Confirm Logout"
- **Description**: "Are you sure you want to sign out? You'll need to sign in again to access your account."

### ⚠️ System Messages

#### **Error Page** (`error`)
- **Title**: "Oops!"
- **Description**: "Something went wrong. Don't worry, our team is here to help you resolve any issues."

#### **Info Page** (`info`)
- **Title**: "Information"
- **Description**: "Important information about your account or the current process. Please read carefully."

### 🔧 Technical Pages

#### **SAML Authentication** (`saml-post-form`)
- **Title**: "SAML Authentication"
- **Description**: "Processing your SAML authentication request. Please wait while we securely verify your credentials."

#### **Authorization Code** (`code`)
- **Title**: "Authorization Code"
- **Description**: "Your authorization code has been generated. Please copy this code to complete the authentication process."

#### **CLI Authentication** (`cli_splash`)
- **Title**: "CLI Authentication"
- **Description**: "Complete the authentication process in your command line interface to access Unipages services."

#### **Certificate Authentication** (`login-x509-info`)
- **Title**: "Certificate Authentication"
- **Description**: "Your digital certificate has been detected. Please review the certificate information and confirm to proceed."

#### **Username Input** (`login-username`)
- **Title**: "Enter Username"
- **Description**: "Please enter your username or email address to continue with the sign-in process."

#### **Password Input** (`login-password`)
- **Title**: "Enter Password"
- **Description**: "Please enter your password to complete the sign-in process and access your Unipages account."

#### **Passkey Conditional Auth** (`login-passkeys-conditional-authenticate`)
- **Title**: "Passkey Authentication"
- **Description**: "Use your passkey for a seamless and secure sign-in experience. No password required!"

## Visual Enhancements

### 🎨 Animations
- **Gradient Shift**: Subtle 8-second gradient animation
- **Fade In Up**: Staggered animations for title, description, and social icons
- **Hover Effects**: Interactive elements with smooth transitions

### 📱 Responsive Design
- **Desktop**: Full split-layout with animated gradient
- **Mobile**: Stacked layout with optimized content
- **Breakpoint**: 900px for responsive behavior

### 🎯 User Experience
- **Contextual Messaging**: Each page shows relevant information
- **Clear Instructions**: Step-by-step guidance for complex processes
- **Professional Tone**: Consistent, friendly, and helpful messaging
- **Brand Consistency**: Maintains Unipages identity across all pages

## Benefits

1. **Enhanced User Experience**: Contextual content reduces confusion
2. **Professional Appearance**: Dynamic content shows attention to detail
3. **Better Engagement**: Relevant messaging keeps users informed
4. **Reduced Support**: Clear instructions minimize user errors
5. **Brand Reinforcement**: Consistent messaging strengthens brand identity

## Customization

To modify the content for any page type, edit the corresponding section in `template.ftl`. The structure uses FreeMarker conditionals to check the `pageId` variable and display appropriate content. 