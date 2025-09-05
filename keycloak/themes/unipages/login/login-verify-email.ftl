<#import "template.ftl" as layout>
<@layout.registrationLayout displayInfo=true; section>
    <#if section = "header">
        ${msg("emailVerifyTitle")}
    <#elseif section = "form">
        <p class="instruction">
            <#if verifyEmail??>
                ${msg("emailVerifyInstruction1",verifyEmail)}
            <#else>
                ${msg("emailVerifyInstruction4",user.email)}
            </#if>
        </p>
        <#if isAppInitiatedAction??>
            <form id="kc-verify-email-form" class="${properties.kcFormClass!}" action="${url.loginAction}" method="post">
                <div class="${properties.kcFormGroupClass!}">
                    <div id="kc-form-buttons" class="${properties.kcFormButtonsClass!}">
                        <#if verifyEmail??>
                            <input class="${properties.kcButtonClass!} ${properties.kcButtonDefaultClass!} ${properties.kcButtonLargeClass!}" type="submit" value="${msg("emailVerifyResend")}" />
                        <#else>
                            <input class="${properties.kcButtonClass!} ${properties.kcButtonPrimaryClass!} ${properties.kcButtonLargeClass!}" type="submit" value="${msg("emailVerifySend")}" />
                        </#if>
                        <button class="${properties.kcButtonClass!} ${properties.kcButtonDefaultClass!} ${properties.kcButtonLargeClass!}" type="submit" name="cancel-aia" value="true" formnovalidate/>${msg("doCancel")}</button>
                    </div>
                </div>
            </form>
        </#if>
    <#elseif section = "info">
        <#if !isAppInitiatedAction??>
            <p class="instruction">
                ${msg("emailVerifyInstruction2")}
                <br/>
                <a href="${url.loginAction}">${msg("doClickHere")}</a> ${msg("emailVerifyInstruction3")}
            </p>
        </#if>
    </#if>
</@layout.registrationLayout>

<script>
// Auto-reload functionality for email verification
(function() {
    console.log('Email verification page loaded, setting up auto-reload...');
    
    // Function to notify parent window about verification status
    function notifyParentWindow(verified) {
        try {
            // Try to send message to parent window (if in iframe)
            if (window.parent && window.parent !== window) {
                window.parent.postMessage({
                    type: 'email-verification-status',
                    verified: verified,
                    email: '${user.email!""}'
                }, '*');
            }
            
            // Try to send message to opener window (if in popup)
            if (window.opener) {
                window.opener.postMessage({
                    type: 'email-verification-status',
                    verified: verified,
                    email: '${user.email!""}'
                }, '*');
            }
            
            // Also try to redirect directly to frontend
            if (verified) {
                const frontendUrl = '${properties.frontendUrl!"http://localhost:5012"}/verify-success';
                console.log('Redirecting to frontend:', frontendUrl);
                window.location.href = frontendUrl;
            }
        } catch (error) {
            console.error('Error notifying parent window:', error);
        }
    }
    
    // Check verification status periodically
    let checkInterval;
    let checkCount = 0;
    const maxChecks = 100; // Check for 5 minutes (100 * 3 seconds)
    
    function checkVerificationStatus() {
        checkCount++;
        console.log('Checking verification status, attempt:', checkCount);
        
        // Check if the page shows verification success
        const successMessage = document.querySelector('text:contains("verified")') || 
                              document.querySelector('*:contains("verified")') ||
                              document.body.innerText.includes('verified');
        
        if (successMessage || document.body.innerText.toLowerCase().includes('verified')) {
            console.log('Verification success detected!');
            notifyParentWindow(true);
            clearInterval(checkInterval);
            return;
        }
        
        // Also try to make a request to check verification status
        fetch('${url.loginAction}', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: 'continue=true',
            credentials: 'include'
        })
        .then(response => {
            if (response.ok) {
                // Check if response indicates verification is complete
                return response.text();
            }
            throw new Error('Verification not complete');
        })
        .then(html => {
            // Check if the response HTML indicates verification success
            if (html.includes('verified') || html.includes('success') || response.url.includes('success')) {
                console.log('Verification success detected via response!');
                notifyParentWindow(true);
                clearInterval(checkInterval);
            }
        })
        .catch(error => {
            console.log('Verification check failed:', error.message);
            
            // Stop checking after max attempts
            if (checkCount >= maxChecks) {
                clearInterval(checkInterval);
                notifyParentWindow(false);
            }
        });
    }
    
    // Start checking immediately and then every 3 seconds
    checkVerificationStatus();
    checkInterval = setInterval(checkVerificationStatus, 3000);
    
    // Also check when the page becomes visible (user switches back to tab)
    document.addEventListener('visibilitychange', function() {
        if (!document.hidden) {
            console.log('Page became visible, checking verification status');
            checkVerificationStatus();
        }
    });
    
    // Check when user focuses the window
    window.addEventListener('focus', function() {
        console.log('Window focused, checking verification status');
        checkVerificationStatus();
    });
    
    // Clean up on page unload
    window.addEventListener('beforeunload', function() {
        if (checkInterval) {
            clearInterval(checkInterval);
        }
    });
})();
</script>
