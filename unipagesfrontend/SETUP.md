# Unipages Frontend Setup Guide

## Environment Variables Required

Create a `.env.local` file in the `unipagesfrontend` directory with the following variables:

### Database Configuration
```bash
# Use either POSTGRES_URL or DATABASE_URL
POSTGRES_URL=postgresql://username:password@localhost:5432/database_name
# DATABASE_URL=postgresql://username:password@localhost:5432/database_name

# Database SSL Configuration (optional)
PGSSLMODE=prefer

# Database Connection Pool Settings (optional)
PGPOOL_MAX=10
PGPOOL_IDLE_TIMEOUT_MS=30000
PGPOOL_CONNECTION_TIMEOUT_MS=10000
```

### Keycloak Configuration
```bash
KEYCLOAK_ISSUER=http://localhost:8080/realms/unipages
KEYCLOAK_ADMIN_CLIENT_ID=admin-cli
KEYCLOAK_ADMIN_CLIENT_SECRET=your_admin_client_secret_here
```

### Next.js Configuration
```bash
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret_here
```

## Database Setup

1. **Create the database tables and functions:**
   ```bash
   # Make a POST request to setup the database
   curl -X POST http://localhost:3000/api/admin/setup-db
   ```

2. **Check database status:**
   ```bash
   # Check what's available in your database
   curl http://localhost:3000/api/admin/check-db-functions
   ```

3. **Test database connection:**
   ```bash
   # Test if database connection is working
   curl http://localhost:3000/api/admin/test-db
   ```

## Common Issues

### 405 Method Not Allowed
- This usually means the API route is not properly configured
- Check that all required environment variables are set
- Ensure the database is accessible

### Database Connection Failed
- Verify `POSTGRES_URL` or `DATABASE_URL` is correct
- Check if PostgreSQL is running
- Ensure the database exists and is accessible

### Keycloak Connection Failed
- Verify `KEYCLOAK_ISSUER` points to a valid Keycloak instance
- Check `KEYCLOAK_ADMIN_CLIENT_ID` and `KEYCLOAK_ADMIN_CLIENT_SECRET`
- Ensure Keycloak is running and accessible

## Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start development server:**
   ```bash
   npm run dev
   ```

3. **Build for production:**
   ```bash
   npm run build
   ```

## API Endpoints

- `GET /api/admin/users` - List all users
- `GET /api/admin/users/[id]` - Get user details
- `PUT /api/admin/users/[id]` - Update user
- `POST /api/admin/setup-db` - Setup database schema
- `GET /api/admin/test-db` - Test database connection
- `GET /api/admin/check-db-functions` - Check database functions
