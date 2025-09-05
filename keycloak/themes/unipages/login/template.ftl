<#macro registrationLayout bodyClass="" displayInfo=false displayMessage=true displayRequiredFields=false>
<!DOCTYPE html>
<html lang="${lang}"<#if realm.internationalizationEnabled> dir="${(locale.rtl)?then('rtl','ltr')}"</#if>>

<head>
    <meta charset="utf-8">
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="robots" content="noindex, nofollow">
    <meta name="viewport" content="width=device-width,initial-scale=1">

    <title>${msg("loginTitle",(realm.displayName!''))}</title>
    <link rel="icon" href="${url.resourcesPath}/img/favicon.ico" />
    
    <!-- Custom Unipages CSS -->
    <link rel="stylesheet" href="${url.resourcesPath}/css/style.css">
    <link href="https://fonts.googleapis.com/css?family=Roboto:400,700&display=swap" rel="stylesheet">
    
    <!-- Keycloak default styles (for functionality) -->
    <#if properties.stylesCommon?has_content>
        <#list properties.stylesCommon?split(' ') as style>
            <link href="${url.resourcesCommonPath}/${style}" rel="stylesheet" />
        </#list>
    </#if>
    <#if properties.styles?has_content>
        <#list properties.styles?split(' ') as style>
            <link href="${url.resourcesPath}/${style}" rel="stylesheet" />
        </#list>
    </#if>
    
    <#if properties.scripts?has_content>
        <#list properties.scripts?split(' ') as script>
            <script src="${url.resourcesPath}/${script}" type="text/javascript"></script>
        </#list>
    </#if>
    
    <script type="importmap">
        {
            "imports": {
                "rfc4648": "${url.resourcesCommonPath}/vendor/rfc4648/rfc4648.js"
            }
        }
    </script>
    <script src="${url.resourcesPath}/js/menu-button-links.js" type="module"></script>
    <#if scripts??>
        <#list scripts as script>
            <script src="${script}" type="text/javascript"></script>
        </#list>
    </#if>
    <script type="module">
        import { startSessionPolling } from "${url.resourcesPath}/js/authChecker.js";
        startSessionPolling("${url.ssoLoginInOtherTabsUrl?no_esc}");
    </script>
    <script type="module">
        document.addEventListener("click", (event) => {
            const link = event.target.closest("a[data-once-link]");
            if (!link) return;
            if (link.getAttribute("aria-disabled") === "true") {
                event.preventDefault();
                return;
            }
            const { disabledClass } = link.dataset;
            if (disabledClass) {
                link.classList.add(...disabledClass.trim().split(/\s+/));
            }
            link.setAttribute("role", "link");
            link.setAttribute("aria-disabled", "true");
        });
    </script>
    <#if authenticationSession??>
        <script type="module">
            import { checkAuthSession } from "${url.resourcesPath}/js/authChecker.js";
            checkAuthSession("${authenticationSession.authSessionIdHash}");
        </script>
    </#if>
</head>

<body data-page-id="login-${pageId}">
    <div class="split-container">
        <!-- Left side - Welcome content -->
        <div class="split-left">
            <div class="welcome-content">
                <#-- Dynamic content based on page type -->
                <#if pageId??>
                    <#if pageId == "login">
                        <h1>Welcome to Unipages</h1>
                        <p>Sign in to your Unipages account to access your personalized dashboard and manage your academic journey.</p>
                    <#elseif pageId == "register">
                        <h1>Join Unipages</h1>
                        <p>Create your account and start your educational journey with Unipages. Connect with students, instructors, and resources.</p>
                    <#elseif pageId == "login-reset-password">
                        <h1>Reset Password</h1>
                        <p>Don't worry! Enter your email address and we'll send you a link to reset your password securely.</p>
                    <#elseif pageId == "login-update-password">
                        <h1>Update Password</h1>
                        <p>For your security, please update your password. Choose a strong password to keep your account safe.</p>
                    <#elseif pageId == "login-update-profile">
                        <h1>Complete Profile</h1>
                        <p>Help us personalize your experience by completing your profile information. This helps us provide better services.</p>
                    <#elseif pageId == "login-verify-email">
                        <h1>Verify Email</h1>
                        <p>We've sent a verification link to your email. Please check your inbox and click the link to verify your account.</p>
                    <#elseif pageId == "login-otp">
                        <h1>Two-Factor Authentication</h1>
                        <p>Enter the verification code from your authenticator app to complete the login process securely.</p>
                    <#elseif pageId == "login-config-totp">
                        <h1>Setup Two-Factor Auth</h1>
                        <p>Enhance your account security by setting up two-factor authentication. Scan the QR code with your authenticator app.</p>
                    <#elseif pageId == "webauthn-authenticate">
                        <h1>Security Key</h1>
                        <p>Use your security key or biometric authentication to sign in securely to your Unipages account.</p>
                    <#elseif pageId == "webauthn-register">
                        <h1>Register Security Key</h1>
                        <p>Set up a security key for passwordless authentication. This provides the highest level of security for your account.</p>
                    <#elseif pageId == "passkeys">
                        <h1>Passkeys</h1>
                        <p>Use passkeys for a secure, passwordless sign-in experience. Your device will handle the authentication seamlessly.</p>
                    <#elseif pageId == "login-oauth-grant">
                        <h1>Application Access</h1>
                        <p>An application is requesting access to your account. Review the permissions and grant access if you trust this application.</p>
                    <#elseif pageId == "login-oauth2-device-verify-user-code">
                        <h1>Device Verification</h1>
                        <p>Enter the code displayed on your device to complete the authentication process and access your account.</p>
                    <#elseif pageId == "login-recovery-authn-code-config">
                        <h1>Recovery Codes</h1>
                        <p>Generate recovery codes to access your account if you lose your authentication device. Keep these codes safe and secure.</p>
                    <#elseif pageId == "login-recovery-authn-code-input">
                        <h1>Recovery Code</h1>
                        <p>Enter one of your recovery codes to access your account. Each code can only be used once.</p>
                    <#elseif pageId == "login-idp-link-confirm">
                        <h1>Link Account</h1>
                        <p>Link your social media account to your Unipages profile for easier sign-in and enhanced features.</p>
                    <#elseif pageId == "login-idp-link-email">
                        <h1>Verify Email</h1>
                        <p>We need to verify your email address before linking your social media account to your Unipages profile.</p>
                    <#elseif pageId == "login-idp-link-confirm-override">
                        <h1>Account Link</h1>
                        <p>An account with this email already exists. Choose how you'd like to proceed with linking your accounts.</p>
                    <#elseif pageId == "login-idp-review-user-profile">
                        <h1>Review Profile</h1>
                        <p>Review and update your profile information from your social media account before completing the sign-in process.</p>
                    <#elseif pageId == "login-page-expired">
                        <h1>Session Expired</h1>
                        <p>Your session has expired for security reasons. Please sign in again to continue accessing your account.</p>
                    <#elseif pageId == "login-passkeys-conditional-authenticate">
                        <h1>Passkey Authentication</h1>
                        <p>Use your passkey for a seamless and secure sign-in experience. No password required!</p>
                    <#elseif pageId == "login-reset-otp">
                        <h1>Reset OTP</h1>
                        <p>Reset your OTP configuration to set up a new authenticator app or device for two-factor authentication.</p>
                    <#elseif pageId == "login-username">
                        <h1>Enter Username</h1>
                        <p>Please enter your username or email address to continue with the sign-in process.</p>
                    <#elseif pageId == "login-password">
                        <h1>Enter Password</h1>
                        <p>Please enter your password to complete the sign-in process and access your Unipages account.</p>
                    <#elseif pageId == "login-x509-info">
                        <h1>Certificate Authentication</h1>
                        <p>Your digital certificate has been detected. Please review the certificate information and confirm to proceed.</p>
                    <#elseif pageId == "select-authenticator">
                        <h1>Choose Authentication</h1>
                        <p>Select your preferred authentication method to continue with the sign-in process securely.</p>
                    <#elseif pageId == "select-organization">
                        <h1>Select Organization</h1>
                        <p>Choose your organization or institution to access the appropriate resources and features.</p>
                    <#elseif pageId == "update-email">
                        <h1>Update Email</h1>
                        <p>Update to ensure you receive important notifications and can access your account.</p>
                    <#elseif pageId == "terms">
                        <h1>Terms of Service</h1>
                        <p>Please review and accept our terms of service to continue using Unipages and its features.</p>
                    <#elseif pageId == "delete-account-confirm">
                        <h1>Delete Account</h1>
                        <p>Are you sure you want to delete your account? This action cannot be undone and will permanently remove all your data.</p>
                    <#elseif pageId == "delete-credential">
                        <h1>Remove Credential</h1>
                        <p>Remove a security credential from your account. This will disable the associated authentication method.</p>
                    <#elseif pageId == "frontchannel-logout">
                        <h1>Sign Out</h1>
                        <p>You have been signed out from all applications. Thank you for using Unipages!</p>
                    <#elseif pageId == "logout-confirm">
                        <h1>Confirm Logout</h1>
                        <p>Are you sure you want to sign out? You'll need to sign in again to access your account.</p>
                    <#elseif pageId == "error">
                        <h1>Oops!</h1>
                        <p>Something went wrong. Don't worry, our team is here to help you resolve any issues.</p>
                    <#elseif pageId == "info">
                        <h1>Information</h1>
                        <p>Important information about your account or the current process. Please read carefully.</p>
                    <#elseif pageId == "saml-post-form">
                        <h1>SAML Authentication</h1>
                        <p>Processing your SAML authentication request. Please wait while we securely verify your credentials.</p>
                    <#elseif pageId == "code">
                        <h1>Authorization Code</h1>
                        <p>Your authorization code has been generated. Please copy this code to complete the authentication process.</p>
                    <#elseif pageId == "cli_splash">
                        <h1>CLI Authentication</h1>
                        <p>Complete the authentication process in your command line interface to access Unipages services.</p>
                    <#else>
                        <h1>Welcome to Unipages</h1>
                        <p>Your comprehensive platform for academic excellence. Connect, learn, and grow with our community.</p>
                    </#if>
                <#else>
                    <h1>Welcome to Unipages</h1>
                    <p>Your comprehensive platform for academic excellence. Connect, learn, and grow with our community.</p>
                </#if>
                
                <div class="social-icons">
                    <a href="#"><img src="${url.resourcesPath}/img/facebook.svg" alt="Facebook" /></a>
                    <a href="#"><img src="${url.resourcesPath}/img/twitter.svg" alt="Twitter" /></a>
                    <a href="#"><img src="${url.resourcesPath}/img/instagram.svg" alt="Instagram" /></a>
                    <a href="#"><img src="${url.resourcesPath}/img/youtube.svg" alt="YouTube" /></a>
                </div>
            </div>
        </div>
        
        <!-- Right side - Form content -->
        <div class="split-right">
            <div class="form-container">
                <!-- Locale selector -->
                <#if realm.internationalizationEnabled && locale.supported?size gt 1>
                    <div class="locale-selector">
                        <div id="kc-locale">
                            <div id="kc-locale-wrapper">
                                <div id="kc-locale-dropdown" class="menu-button-links">
                                    <button tabindex="1" id="kc-current-locale-link" aria-label="${msg("languages")}" aria-haspopup="true" aria-expanded="false" aria-controls="language-switch1">${locale.current}</button>
                                    <ul role="menu" tabindex="-1" aria-labelledby="kc-current-locale-link" aria-activedescendant="" id="language-switch1">
                                        <#list locale.supported as l>
                                            <li role="none">
                                                <a role="menuitem" class="pf-c-dropdown__menu-item" href="${l.url}">${l.label}</a>
                                            </li>
                                        </#list>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </#if>
                
                <!-- Header -->
                <div id="kc-header">
                    <div id="kc-header-wrapper">${kcSanitize(msg("loginTitleHtml",(realm.displayNameHtml!'')))?no_esc}</div>
                </div>
                
                <!-- Messages -->
                <#if displayMessage && message?has_content && (message.type != 'warning' || !isAppInitiatedAction??)>
                    <div class="kc-feedback-text ${message.type}">
                        <#if message.type = 'success'><span class="pficon pficon-ok"></span></#if>
                        <#if message.type = 'warning'><span class="pficon pficon-warning-triangle-o"></span></#if>
                        <#if message.type = 'error'><span class="pficon pficon-error-circle-o"></span></#if>
                        <#if message.type = 'info'><span class="pficon pficon-info"></span></#if>
                        <span class="message-text">${kcSanitize(message.summary)?no_esc}</span>
                    </div>
                </#if>
                
                <!-- Main content -->
                <#nested "form">
                
                <!-- Info section -->
                <#if displayInfo>
                    <#nested "info">
                </#if>
                
                <!-- Social providers -->
                <#nested "socialProviders">
            </div>
        </div>
    </div>
</body>
</html>
</#macro>
