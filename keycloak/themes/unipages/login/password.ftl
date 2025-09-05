<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Unipages - Update Password</title>
    <link rel="stylesheet" href="${url.resourcesPath}/css/style.css">
    <link href="https://fonts.googleapis.com/css?family=Roboto:400,700&display=swap" rel="stylesheet">
</head>
<body>
    <div class="split-container">
        <div class="split-left">
            <div class="welcome-content">
                <h1>Security First</h1>
                <p>For your security, please update your password. Choose a strong password that you'll remember.</p>
                <div class="social-icons">
                    <a href="#"><img src="${url.resourcesPath}/img/facebook.svg" alt="Facebook" /></a>
                    <a href="#"><img src="${url.resourcesPath}/img/twitter.svg" alt="Twitter" /></a>
                    <a href="#"><img src="${url.resourcesPath}/img/instagram.svg" alt="Instagram" /></a>
                    <a href="#"><img src="${url.resourcesPath}/img/youtube.svg" alt="YouTube" /></a>
                </div>
            </div>
        </div>
        <div class="split-right">
            <div class="form-container">
                <h2>Update password</h2>
                
                <#if message?has_content>
                    <div class="kc-feedback-text">${message.summary}</div>
                </#if>
                
                <#if message.type = 'warning'>
                    <div class="alert-warning">
                        <span class="alert-icon">⚠</span>
                        You need to change your password to activate your account.
                    </div>
                </#if>
                
                <form method="post" action="${url.loginAction}">
                    <div class="form-group">
                        <label for="password-new">New Password</label>
                        <div class="password-input-group">
                            <input type="password" id="password-new" name="password-new" required />
                            <button type="button" class="password-toggle" onclick="togglePassword('password-new')">
                                <span class="eye-icon">👁</span>
                            </button>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="password-confirm">Confirm password</label>
                        <div class="password-input-group">
                            <input type="password" id="password-confirm" name="password-confirm" required />
                            <button type="button" class="password-toggle" onclick="togglePassword('password-confirm')">
                                <span class="eye-icon">👁</span>
                            </button>
                        </div>
                    </div>
                    
                    <div class="form-group checkbox-group">
                        <label class="checkbox-label">
                            <input type="checkbox" name="logout-sessions" />
                            <span class="checkmark"></span>
                            Sign out from other devices
                        </label>
                    </div>
                    
                    <button type="submit" class="login-btn">Submit</button>
                </form>
            </div>
        </div>
    </div>
    
    <script>
        function togglePassword(inputId) {
            const input = document.getElementById(inputId);
            const button = input.nextElementSibling;
            const icon = button.querySelector('.eye-icon');
            
            if (input.type === 'password') {
                input.type = 'text';
                icon.textContent = '🙈';
            } else {
                input.type = 'password';
                icon.textContent = '👁';
            }
        }
    </script>
</body>
</html> 