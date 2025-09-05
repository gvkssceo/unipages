# Branding Update: UniPages → UniMark

## Overview

This document outlines the comprehensive branding update from "UniPages" to "UniMark" across the entire application.

## Changes Made

### 1. Configuration Files
- **`lib/config.ts`** - Updated all branding references from "UniPages" to "UniMark"
- **`package.json`** - Updated project name from "unipages-frontend" to "unimark-frontend"

### 2. Branding References
- **Application Name**: "UniMark" (was "UniPages")
- **Application Title**: "UniMark Admin Dashboard" (was "UniPages Admin Dashboard")
- **Footer**: "© 2025 UniMark. All rights reserved." (was "© 2025 UniPages. All rights reserved.")
- **URLs**: Updated from "unipages.app" to "unimark.app"
- **Database**: Updated from "unipages" to "unimark"
- **Keycloak Realm**: Updated from "unipages" to "unimark"

### 3. Logo and Visual Assets
- **Logo**: Updated from favicon.ico to logo.jpg
- **Favicon**: Updated to use logo.jpg
- **Header Logo**: Updated to display the new UniMark logo

### 4. Search Placeholders
- **Desktop Search**: "Search UniMark" (was "Search UniPages")
- **Mobile Search**: "Search UniMark" (was "Search UniPages")

## Usage Examples

### In Components
```tsx
// Display application name
<AppName /> // Displays: "UniMark"
<AppNameShort /> // Displays: "UniMark"
<AppNameLong /> // Displays: "UniMark Admin Dashboard"

// With year
<AppName showYear={true} /> // Displays: "UniMark 2025"
```

### In Configuration
```tsx
import { APP_CONFIG, APP_NAME, APP_BRANDING } from '@/lib/config';

// Access branding values
APP_NAME // "UniMark"
APP_BRANDING.title // "UniMark Admin Dashboard"
APP_URLS.admin // "https://admin.unimark.app"
APP_DATABASE.name // "unimark"
APP_KEYCLOAK.realm // "unimark"
```

## Files Updated

1. **`lib/config.ts`** - Main configuration
2. **`components/layouts/Header.tsx`** - Header logo and search placeholders
3. **`app/layout.tsx`** - Favicon configuration
4. **`package.json`** - Project name
5. **`README.md`** - Documentation
6. **`utils/toast.ts`** - Logout redirect URL
7. **`app/api/auth/logout/route.ts`** - Logout redirect URL

## Notes

- The logo.jpg file should be placed in the `public/` directory
- All branding references now consistently use "UniMark"
- URLs and database names have been updated accordingly
- The favicon now uses the new logo.jpg file
