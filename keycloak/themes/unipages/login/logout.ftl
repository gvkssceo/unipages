<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Unipages - Logout</title>
    <link rel="stylesheet" href="${url.resourcesPath}/css/style.css">
    <link href="https://fonts.googleapis.com/css?family=Roboto:400,700&display=swap" rel="stylesheet">
</head>
<body>
    <div class="split-container">
        <div class="split-left">
            <div class="welcome-content">
                <h1>Goodbye!</h1>
                <p>Thank you for using UNIPAGES. We hope to see you again soon. Your session has been securely ended.</p>
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
                <h2>Logging out</h2>
                <p class="logout-message">Do you want to log out?</p>
                <form method="post" action="${url.logoutConfirmAction}">
                    <button type="submit" class="login-btn">Logout</button>
                </form>
                <div class="cancel-link">
                    <a href="${url.loginUrl}">Cancel</a>
                </div>
            </div>
        </div>
    </div>
</body>
</html> 