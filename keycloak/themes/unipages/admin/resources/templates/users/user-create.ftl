<#import "template.ftl" as layout>
<@layout.registrationLayout displayInfo=realm.password && realm.registrationAllowed && !registrationDisabled??; section>
    <#if section = "header">
        <h2>Create User</h2>
    <#elseif section = "form">
        <form id="kc-form-create-user" action="${url.loginAction}" method="post">
            <div class="form-group">
                <label for="username" class="form-label">Username *</label>
                <input 
                    type="text" 
                    id="username" 
                    name="username" 
                    class="form-control" 
                    required 
                    autofocus
                    placeholder="Enter username"
                />
            </div>

            <div class="form-group">
                <label for="email" class="form-label">Email *</label>
                <input 
                    type="email" 
                    id="email" 
                    name="email" 
                    class="form-control" 
                    required
                    placeholder="Enter email address"
                />
            </div>

            <div class="form-group">
                <label for="firstName" class="form-label">First Name</label>
                <input 
                    type="text" 
                    id="firstName" 
                    name="firstName" 
                    class="form-control"
                    placeholder="Enter first name"
                />
            </div>

            <div class="form-group">
                <label for="lastName" class="form-label">Last Name</label>
                <input 
                    type="text" 
                    id="lastName" 
                    name="lastName" 
                    class="form-control"
                    placeholder="Enter last name"
                />
            </div>

            <div class="form-group">
                <label for="password" class="form-label">Password *</label>
                <input 
                    type="password" 
                    id="password" 
                    name="password" 
                    class="form-control" 
                    required
                    placeholder="Enter password"
                />
            </div>

            <div class="form-group">
                <label class="checkbox-label">
                    <input type="checkbox" id="emailVerified" name="emailVerified" value="true">
                    Email verified
                </label>
            </div>

            <div class="form-group">
                <label class="checkbox-label">
                    <input type="checkbox" id="enabled" name="enabled" value="true" checked>
                    User enabled
                </label>
            </div>

            <div class="form-actions">
                <button type="submit" class="btn btn-primary">Create User</button>
                <a href="${url.backToUsers}" class="btn btn-secondary">Cancel</a>
            </div>
        </form>
    </#if>
</@layout.registrationLayout> 