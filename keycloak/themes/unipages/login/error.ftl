<#import "template.ftl" as layout>
<@layout.registrationLayout displayMessage=false; section>
    <#if section = "header">
        <h2>Error</h2>
    <#elseif section = "form">
        <div class="error-details">
            <#if message?? && message.summary??>
                <p><strong>Error:</strong> ${kcSanitize(message.summary)?no_esc}</p>
            <#else>
                <p><strong>Error:</strong> An unexpected error occurred.</p>
            </#if>
            
            <#if skipLink??>
            <#else>
                <#if client?? && client.baseUrl?has_content>
                    <p><strong>Application:</strong> <a href="${client.baseUrl}">${kcSanitize(msg("backToApplication"))?no_esc}</a></p>
                </#if>
            </#if>
        </div>
        
        <div class="error-actions">
            <a href="${url.loginUrl}" class="login-btn">Back to Login</a>
        </div>
    </#if>
</@layout.registrationLayout>