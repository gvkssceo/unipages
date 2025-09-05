<#import "template.ftl" as layout>
<@layout.registrationLayout displayMessage=false; section>
    <#if section = "header">
        <h2>Information</h2>
    <#elseif section = "form">
        <div class="info-message">
            <#if messageHeader??>
                <h3>${kcSanitize(msg("${messageHeader}"))?no_esc}</h3>
            </#if>
            <p>${message.summary}<#if requiredActions??><#list requiredActions>: <b><#items as reqActionItem>${kcSanitize(msg("requiredAction.${reqActionItem}"))?no_esc}<#sep>, </#items></b></#list><#else></#if></p>
        </div>
        
        <#if skipLink??>
        <#else>
            <#if pageRedirectUri?has_content>
                <div class="back-to-login">
                    <a href="${pageRedirectUri}">${kcSanitize(msg("backToApplication"))?no_esc}</a>
                </div>
            <#elseif actionUri?has_content>
                <div class="back-to-login">
                    <a href="${actionUri}">${kcSanitize(msg("proceedWithAction"))?no_esc}</a>
                </div>
            <#elseif (client.baseUrl)?has_content>
                <div class="back-to-login">
                    <a href="${client.baseUrl}">${kcSanitize(msg("backToApplication"))?no_esc}</a>
                </div>
            </#if>
        </#if>
    </#if>
</@layout.registrationLayout>