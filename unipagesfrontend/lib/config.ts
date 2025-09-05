// Application Configuration
export const APP_CONFIG = {
  // Application Name
  name: "UniMark",
  nameShort: "UniMark",
  nameLong: "UniMark Admin Dashboard",
  
  // Application Description
  description: "A comprehensive admin dashboard for system administration and user management",
  
  // URLs and Domains
  urls: {
    admin: "https://admin.unimark.app",
    main: "https://unimark.app",
    local: "http://localhost:5012",
  },
  
  // Branding
  branding: {
    title: "UniMark Admin Dashboard",
    subtitle: "Manage setup tasks and quick actions",
    footer: "© 2025 UniMark. All rights reserved.",
  },
  
  // Database
  database: {
    name: "unimark",
    schema: "unimark",
  },
  
  // Keycloak
  keycloak: {
    realm: "unimark",
    clientId: "unimark-admin",
    baseUrl: "https://keycloak.unimark.app",
    logoutUrl: "https://keycloak.unimark.app/realms/unimark/protocol/openid-connect/logout",
  },
} as const;

// Export individual values for convenience
export const APP_NAME = APP_CONFIG.name;
export const APP_NAME_SHORT = APP_CONFIG.nameShort;
export const APP_NAME_LONG = APP_CONFIG.nameLong;
export const APP_DESCRIPTION = APP_CONFIG.description;
export const APP_BRANDING = APP_CONFIG.branding;
export const APP_URLS = APP_CONFIG.urls;
export const APP_DATABASE = APP_CONFIG.database;
export const APP_KEYCLOAK = APP_CONFIG.keycloak;
