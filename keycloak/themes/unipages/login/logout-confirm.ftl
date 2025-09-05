<#import "template.ftl" as layout>
<@layout.registrationLayout displayMessage=false; section>
    <#if section = "header">
        <h2>Logout</h2>
    <#elseif section = "form">
        <div class="logout-message">
            <p>${msg("logoutConfirmHeader")}</p>
        </div>
        
        <form action="${url.logoutConfirmAction}" method="POST">
            <input type="hidden" name="session_code" value="${logoutConfirm.code}">
            <div class="form-group">
                <button type="submit" class="login-btn">${msg("doLogout")}</button>
            </div>
        </form>
        
        <#if logoutConfirm.skipLink>
        <#else>
            <#if (client.baseUrl)?has_content>
                <div class="cancel-link">
                    <a href="${client.baseUrl}">${kcSanitize(msg("backToApplication"))?no_esc}</a>
                </div>
            </#if>
        </#if>
    </#if>
</@layout.registrationLayout>
