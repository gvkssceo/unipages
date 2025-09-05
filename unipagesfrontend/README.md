# UniMark Admin Dashboard

A comprehensive admin dashboard built with Next.js 15, NextAuth.js, and Keycloak for system administration and user management.

## Features

- **User Management**: Create, update, delete, and manage user accounts
- **Role Management**: Define and assign user roles and permissions
- **Profile Management**: Manage user profiles and access levels
- **Permission Sets**: Configure granular permissions for tables and fields
- **Database Operations**: Direct database management and monitoring
- **System Analytics**: Dashboard with statistics and system metrics

## Getting Started

First, run the development server:

```bash
npm run dev
```

Open [https://admin.unimark.app](https://admin.unimark.app) with your browser to access the admin dashboard.

## Environment variables

Add a `.env.local` with:

```ini
NEXTAUTH_URL=http://localhost:5012
NEXTAUTH_SECRET=...

KEYCLOAK_ID=...
KEYCLOAK_SECRET=...
KEYCLOAK_ISSUER=http://localhost:5010/realms/unimark
KEYCLOAK_ADMIN_CLIENT_ID=...
KEYCLOAK_ADMIN_CLIENT_SECRET=...

# Postgres for app schema
POSTGRES_URL=postgresql://unimark:<password>@<host>:5432/unimark
PGSSLMODE=require
```


