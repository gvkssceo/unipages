<#import "template.ftl" as layout>
<@layout.registrationLayout displayInfo=true displayMessage=!messagesPerField.existsError('username'); section>
    <#if section = "header">
        <h2>Reset Password</h2>
    <#elseif section = "form">
        <div id="kc-form">
            <div id="kc-form-wrapper">
                <form id="kc-reset-password-form" action="${url.loginAction}" method="post">
                    <div class="form-group">
                        <input type="text" id="username" name="username" 
                               placeholder="<#if !realm.loginWithEmailAllowed>${msg("username")}<#elseif !realm.registrationEmailAsUsername>${msg("usernameOrEmail")}<#else>${msg("email")}</#if>"
                               value="${(auth.attemptedUsername!'')}"
                               autofocus 
                               autocomplete="username"
                               aria-invalid="<#if messagesPerField.existsError('username')>true</#if>"
                               required />
                        
                        <#if messagesPerField.existsError('username')>
                            <span id="input-error-username" class="error-message" aria-live="polite">
                                ${kcSanitize(messagesPerField.get('username'))?no_esc}
                            </span>
                        </#if>
                    </div>
                    
                    <div id="kc-form-buttons" class="form-group">
                        <button type="submit" class="login-btn">${msg("doSubmit")}</button>
                    </div>
                </form>
            </div>
        </div>
        
        <div class="back-to-login">
            <a href="${url.loginUrl}">${kcSanitize(msg("backToLogin"))?no_esc}</a>
        </div>
    <#elseif section = "info" >
        <#if realm.duplicateEmailsAllowed>
            <p>${msg("emailInstructionUsername")}</p>
        <#else>
            <p>${msg("emailInstruction")}</p>
        </#if>
    </#if>
</@layout.registrationLayout>
