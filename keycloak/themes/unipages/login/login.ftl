<#import "template.ftl" as layout>
<#import "passkeys.ftl" as passkeys>
<@layout.registrationLayout displayMessage=!messagesPerField.existsError('username','password') displayInfo=realm.password && realm.registrationAllowed && !registrationDisabled??; section>
    <#if section = "header">
        <h2>Sign in</h2>
    <#elseif section = "form">
        <div id="kc-form">
            <div id="kc-form-wrapper">
                <#if realm.password>
                    <form id="kc-form-login" onsubmit="login.disabled = true; return true;" action="${url.loginAction}" method="post">
                        <#if !usernameHidden??>
                            <div class="form-group">
                                <label for="username" class="form-label">Username or Email</label>
                                <input tabindex="2" id="username" class="form-control" name="username" value="${(login.username!'')}" type="text"
                                       placeholder="Enter your username or email address"
                                       autofocus autocomplete="${(enableWebAuthnConditionalUI?has_content)?then('username webauthn', 'username')}"
                                       aria-invalid="<#if messagesPerField.existsError('username','password')>true</#if>"
                                       dir="ltr"
                                       required 
                                       oninput="detectInputType(this)" />

                                <#if messagesPerField.existsError('username','password')>
                                    <span id="input-error" class="error-message" aria-live="polite">
                                        ${kcSanitize(messagesPerField.getFirstError('username','password'))?no_esc}
                                    </span>
                                </#if>
                            </div>
                        </#if>

                        <div class="form-group">
                            <label for="password" class="form-label">Password</label>
                            <div class="password-input-group">
                                <input tabindex="3" id="password" class="form-control" name="password" type="password" 
                                       placeholder="Enter your password"
                                       autocomplete="current-password"
                                       aria-invalid="<#if messagesPerField.existsError('username','password')>true</#if>"
                                       required />
                                <button class="password-toggle" type="button" aria-label="${msg("showPassword")}"
                                        aria-controls="password" data-password-toggle tabindex="4">
                                    <i class="eye-icon" aria-hidden="true">👁</i>
                                </button>
                            </div>

                            <#if usernameHidden?? && messagesPerField.existsError('username','password')>
                                <span id="input-error" class="error-message" aria-live="polite">
                                    ${kcSanitize(messagesPerField.getFirstError('username','password'))?no_esc}
                                </span>
                            </#if>
                        </div>

                        <div class="form-group">
                            <div id="kc-form-options">
                                <#if realm.rememberMe && !usernameHidden??>
                                    <div class="checkbox-group">
                                        <label class="checkbox-label">
                                            <#if login.rememberMe??>
                                                <input tabindex="5" id="rememberMe" name="rememberMe" type="checkbox" checked> ${msg("rememberMe")}
                                            <#else>
                                                <input tabindex="5" id="rememberMe" name="rememberMe" type="checkbox"> ${msg("rememberMe")}
                                            </#if>
                                        </label>
                                    </div>
                                </#if>
                            </div>
                            <#if realm.resetPasswordAllowed>
                                <div class="form-links">
                                    <a tabindex="6" href="${url.loginResetCredentialsUrl}">${msg("doForgotPassword")}</a>
                                </div>
                            </#if>
                        </div>

                        <div id="kc-form-buttons" class="form-group">
                            <input type="hidden" id="id-hidden-input" name="credentialId" <#if auth.selectedCredential?has_content>value="${auth.selectedCredential}"</#if>/>
                            <button tabindex="7" class="login-btn" name="login" id="kc-login" type="submit">${msg("doLogIn")}</button>
                        </div>
                    </form>
                </#if>
            </div>
        </div>
        <@passkeys.conditionalUIData />
        <script type="module" src="${url.resourcesPath}/js/passwordVisibility.js"></script>
        
        <!-- Username/Email Detection Script -->
        <script>
            function detectInputType(input) {
                const value = input.value.trim();
                const isEmail = value.includes('@') && value.includes('.');
                
                // Update autocomplete attribute based on input type
                if (isEmail) {
                    input.setAttribute('autocomplete', 'email');
                    input.setAttribute('type', 'email');
                } else {
                    input.setAttribute('autocomplete', 'username');
                    input.setAttribute('type', 'text');
                }
                
                // Update placeholder text
                if (isEmail) {
                    input.placeholder = "Enter your email address";
                } else {
                    input.placeholder = "Enter your username";
                }
            }
            
            // Initialize on page load
            document.addEventListener('DOMContentLoaded', function() {
                const usernameInput = document.getElementById('username');
                if (usernameInput) {
                    detectInputType(usernameInput);
                }
            });
        </script>
    <#elseif section = "info" >
        <#if realm.password && realm.registrationAllowed && !registrationDisabled??>
            <div id="kc-registration-container">
                <div id="kc-registration">
                    <div class="register-link">
                        <span>${msg("noAccount")}</span>
                        <a tabindex="8" href="${url.registrationUrl}">${msg("doRegister")}</a>
                    </div>
                </div>
            </div>
        </#if>
    <#elseif section = "socialProviders" >
        <#if realm.password && social?? && social.providers?has_content>
            <div id="kc-social-providers" class="social-providers">
                <hr/>
                <h3>${msg("identity-provider-login-label")}</h3>
                <div class="social-providers-grid">
                    <#list social.providers as p>
                        <a href="${p.loginUrl}" class="social-provider-btn" id="social-${p.alias}">
                            <#if p.iconClasses?has_content>
                                <i class="${p.iconClasses}"></i>
                            </#if>
                            <span>${p.displayName}</span>
                        </a>
                    </#list>
                </div>
            </div>
        </#if>
    </#if>
</@layout.registrationLayout>
