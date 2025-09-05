# Unipages Keycloak Theme

## Overview

This is a custom Keycloak theme for the Unipages application that provides a modern, professional authentication interface with a split-layout design featuring a gradient left panel and clean white form area on the right.

## Theme Structure

### Theme Types
- **login** - Authentication pages (login, register, password reset, etc.)
- **account** - User account management
- **admin** - Administration interface
- **email** - Email templates
- **welcome** - Welcome pages

### Key Files

#### Templates
- `template.ftl` - Main layout template with split-container design
- `login.ftl` - Main login form
- `register.ftl` - User registration form
- `error.ftl` - Error pages
- `info.ftl` - Information pages
- `logout-confirm.ftl` - Logout confirmation
- `login-reset-password.ftl` - Password reset form

#### Styling
- `resources/css/style.css` - Main stylesheet with all custom styling
- `resources/img/` - Social media icons and branding assets

## Design Features

### Visual Design
- **Split Layout**: Two-column design with gradient left panel and white right panel
- **Color Scheme**: 
  - Primary gradient: `linear-gradient(135deg, #a770ef 0%, #f6d365 50%, #fd6e6a 100%)`
  - Background: `#f4f6fb` (light gray-blue)
  - Form background: White with subtle shadows
- **Typography**: Roboto font family
- **Responsive Design**: Mobile-friendly with breakpoints at 900px

### Interactive Elements
- **Social Media Icons**: Facebook, Twitter, Instagram, YouTube with hover effects
- **Form Elements**: Modern input styling with focus states
- **Buttons**: Gradient buttons with hover animations
- **Password Toggle**: Eye icon for password visibility

## Customization Guide

### Adding New Templates

1. **Copy from Base Theme**: Copy the template from `org.keycloak.keycloak-themes-26.3.2/theme/base/login/`
2. **Update Template**: Modify to use the new layout structure
3. **Add CSS**: Add any new styles to `style.css`

### Template Structure

All templates should use the `template.ftl` layout:

```ftl
<#import "template.ftl" as layout>
<@layout.registrationLayout displayMessage=true displayInfo=true; section>
    <#if section = "header">
        <h2>Page Title</h2>
    <#elseif section = "form">
        <!-- Main content here -->
    <#elseif section = "info" >
        <!-- Info section -->
    </#if>
</@layout.registrationLayout>
```

### CSS Classes

#### Layout Classes
- `.split-container` - Main container
- `.split-left` - Left panel with gradient
- `.split-right` - Right panel with form
- `.form-container` - Form wrapper

#### Form Classes
- `.form-group` - Form field wrapper
- `.form-control` - Input styling
- `.login-btn` - Primary button
- `.password-input-group` - Password field with toggle

#### Message Classes
- `.kc-feedback-text` - Message styling
- `.error-message` - Error text
- `.alert-warning` - Warning messages

## Available Templates

### Authentication Templates
- `login.ftl` - Main login form
- `register.ftl` - User registration
- `login-password.ftl` - Password-only login
- `login-username.ftl` - Username-only login
- `login-otp.ftl` - OTP authentication
- `login-update-password.ftl` - Password update
- `login-update-profile.ftl` - Profile update
- `login-reset-password.ftl` - Password reset
- `login-verify-email.ftl` - Email verification
- `login-oauth-grant.ftl` - OAuth consent
- `webauthn-authenticate.ftl` - WebAuthn authentication
- `passkeys.ftl` - Passkeys authentication

### System Templates
- `error.ftl` - Error pages
- `info.ftl` - Information pages
- `logout-confirm.ftl` - Logout confirmation
- `login-page-expired.ftl` - Session expired
- `frontchannel-logout.ftl` - Front-channel logout

### Specialized Templates
- `login-config-totp.ftl` - TOTP configuration
- `login-recovery-authn-code-config.ftl` - Recovery codes
- `select-authenticator.ftl` - Authenticator selection
- `select-organization.ftl` - Organization selection

## Responsive Design

The theme is fully responsive with:
- **Desktop**: Split layout with side-by-side panels
- **Mobile**: Stacked layout with full-width panels
- **Breakpoint**: 900px

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile browsers
- Progressive enhancement for older browsers

## Maintenance

### Updating Theme
1. **Backup**: Always backup before making changes
2. **Test**: Test changes in development mode
3. **Deploy**: Deploy to production after testing

### Development Mode
When running Keycloak in development mode (`start-dev`), themes are not cached, allowing for real-time updates without server restart.

### Production Deployment
1. **Build**: Run `build` command to install themes
2. **Restart**: Restart Keycloak server
3. **Verify**: Test all authentication flows

## Customization Examples

### Changing Colors
Update the gradient in `style.css`:
```css
.split-left {
    background: linear-gradient(135deg, #your-color-1 0%, #your-color-2 50%, #your-color-3 100%);
}
```

### Adding Custom Logo
1. Place logo file in `resources/img/`
2. Update template to reference the logo
3. Add CSS for logo styling

### Modifying Social Icons
1. Replace SVG files in `resources/img/`
2. Update links in templates
3. Adjust styling in CSS

## Troubleshooting

### Common Issues
1. **Theme not loading**: Check file permissions and paths
2. **Styling not applied**: Clear browser cache
3. **Template errors**: Check FreeMarker syntax
4. **Responsive issues**: Test on different screen sizes

### Debug Mode
Enable Keycloak debug logging to troubleshoot theme issues:
```bash
./kc.sh start-dev --log-level=DEBUG
```

## Support

For theme-related issues:
1. Check Keycloak documentation
2. Review template syntax
3. Test in development mode
4. Check browser console for errors

## Version History

- **v1.0** - Initial theme with split-layout design
- **v1.1** - Added responsive design and mobile support
- **v1.2** - Enhanced form styling and accessibility
- **v1.3** - Added all authentication templates support 