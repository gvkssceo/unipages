<#import "template.ftl" as layout>
<#import "user-profile-commons.ftl" as userProfileCommons>
<#import "register-commons.ftl" as registerCommons>
<@layout.registrationLayout displayMessage=messagesPerField.exists('global') displayRequiredFields=true; section>
    <#if section = "header">
        <#if messageHeader??>
            <h2>${kcSanitize(msg("${messageHeader}"))?no_esc}</h2>
        <#else>
            <h2>${msg("registerTitle")}</h2>
        </#if>
    <#elseif section = "form">
        <div id="kc-form">
            <div id="kc-form-wrapper">
                <form id="kc-register-form" action="${url.registrationAction}" method="post">
                    <@userProfileCommons.userProfileFormFields; callback, attribute>
                        <#if callback = "afterField">
                            <#-- render password fields just under the username or email (if used as username) -->
                            <#if passwordRequired?? && (attribute.name == 'username' || (attribute.name == 'email' && realm.registrationEmailAsUsername))>
                                <div class="form-group">
                                    <div class="password-input-group">
                                        <input type="password" id="password" name="password" 
                                               placeholder="${msg("password")}"
                                               autocomplete="new-password"
                                               aria-invalid="<#if messagesPerField.existsError('password','password-confirm')>true</#if>"
                                               required />
                                        <button class="password-toggle" type="button" aria-label="${msg("showPassword")}">
                                            <i class="eye-icon" aria-hidden="true">👁</i>
                                        </button>
                                    </div>
                                    <#if messagesPerField.existsError('password')>
                                        <span id="input-error-password" class="error-message" aria-live="polite">
                                            ${kcSanitize(messagesPerField.get('password'))?no_esc}
                                        </span>
                                    </#if>
                                </div>

                                <div class="form-group">
                                    <div class="password-input-group">
                                        <input type="password" id="password-confirm" name="password-confirm" 
                                               placeholder="${msg("passwordConfirm")}"
                                               autocomplete="new-password"
                                               aria-invalid="<#if messagesPerField.existsError('password-confirm')>true</#if>"
                                               required />
                                        <button class="password-toggle" type="button" aria-label="${msg("showPassword")}">
                                            <i class="eye-icon" aria-hidden="true">👁</i>
                                        </button>
                                    </div>
                                    <#if messagesPerField.existsError('password-confirm')>
                                        <span id="input-error-password-confirm" class="error-message" aria-live="polite">
                                            ${kcSanitize(messagesPerField.get('password-confirm'))?no_esc}
                                        </span>
                                    </#if>
                                </div>
                            </#if>
                        </#if>
                    </@userProfileCommons.userProfileFormFields>

                    <@registerCommons.termsAcceptance/>

                    <#if recaptchaRequired?? && (recaptchaVisible!false)>
                        <div class="form-group">
                            <div class="g-recaptcha" data-size="compact" data-sitekey="${recaptchaSiteKey}" data-action="${recaptchaAction}"></div>
                        </div>
                    </#if>

                    <div class="form-group">
                        <div id="kc-form-options">
                            <div class="back-to-login">
                                <span><a href="${url.loginUrl}">${kcSanitize(msg("backToLogin"))?no_esc}</a></span>
                            </div>
                        </div>

                        <#if recaptchaRequired?? && !(recaptchaVisible!false)>
                            <script>
                                function onSubmitRecaptcha(token) {
                                    document.getElementById("kc-register-form").requestSubmit();
                                }
                            </script>
                            <div id="kc-form-buttons" class="form-group">
                                <button class="login-btn g-recaptcha" 
                                    data-sitekey="${recaptchaSiteKey}" data-callback='onSubmitRecaptcha' data-action='${recaptchaAction}' type="submit">
                                    ${msg("doRegister")}
                                </button>
                            </div>
                        <#else>
                            <div id="kc-form-buttons" class="form-group">
                                <button class="login-btn" type="submit">${msg("doRegister")}</button>
                            </div>
                        </#if>
                    </div>
                </form>
            </div>
        </div>
        <script type="module" src="${url.resourcesPath}/js/passwordVisibility.js"></script>
    </#if>
</@layout.registrationLayout>
