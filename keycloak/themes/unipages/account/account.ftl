<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Unipages Account</title>
    <link rel="stylesheet" href="${url.resourcesPath}/css/style.css">
    <link href="https://fonts.googleapis.com/css?family=Roboto:400,700&display=swap" rel="stylesheet">
</head>
<body>
    <div class="split-container">
        <div class="split-left">
            <div class="welcome-content">
                <h1>Welcome Back</h1>
                <p>Manage your account information and settings with ease.</p>
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
                <#-- Render the main account content here -->
                <@main/>
            </div>
        </div>
    </div>
</body>
</html> 