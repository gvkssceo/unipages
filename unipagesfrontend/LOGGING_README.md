# Performance Logging System

This system provides comprehensive logging for API requests and page loads to track performance and loading times.

## Features

### API Request Logging
- **Format**: `<api-path> requested at <timestamp> [request-id]`
- **Completion**: `<api-path> successful/failed at <timestamp> [request-id] (response-time-ms)`
- **Automatic tracking** via middleware for all `/api/*` routes
- **Manual tracking** available for custom implementations

### Page Load Logging
- **Format**: `opened page <route> at <timestamp> [request-id]`
- **Completion**: `completed page <route> at <timestamp> [request-id] (load-time-ms)`
- **Automatic tracking** via PageLoadTracker component
- **Manual tracking** available via usePageLoadTracking hook

## Implementation

### 1. Middleware (middleware.ts)
Automatically intercepts all requests and logs:
- API requests to `/api/*` paths
- Page requests (excluding static assets)

### 2. API Logging (lib/api-logger.ts)
Provides utilities for API route logging:
```typescript
import { logApiRequest, logApiResponse } from '@/lib/api-logger';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const requestId = logApiRequest(request);
  
  try {
    // Your API logic here
    const response = NextResponse.json(data);
    logApiResponse(request, 200, startTime);
    return response;
  } catch (error) {
    logApiResponse(request, 500, startTime);
    throw error;
  }
}
```

### 3. Page Load Tracking (components/PageLoadTracker.tsx)
Automatically tracks page loads when included in the layout:
```typescript
import { PageLoadTracker } from '@/components/PageLoadTracker';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <PageLoadTracker />
        {children}
      </body>
    </html>
  );
}
```

### 4. Manual Page Tracking
For custom page load tracking:
```typescript
import { usePageLoadTracking } from '@/components/PageLoadTracker';

function MyComponent() {
  const { trackPageLoad } = usePageLoadTracking();
  
  useEffect(() => {
    trackPageLoad('/custom-route');
  }, []);
}
```

## Log Examples

### API Request Logs
```
<api/health> requested at 2024-01-15T10:30:45.123Z [abc123def]
<api/health> successful at 2024-01-15T10:30:45.156Z [abc123def] (33ms)

<api/admin/users> requested at 2024-01-15T10:31:12.456Z [xyz789ghi]
<api/admin/users> failed at 2024-01-15T10:31:12.789Z [xyz789ghi] (333ms)
```

### Page Load Logs
```
opened page /admin/users at 2024-01-15T10:30:45.123Z [def456jkl]
completed page /admin/users at 2024-01-15T10:30:47.234Z [def456jkl] (2111ms)

opened page /admin/roles at 2024-01-15T10:31:00.000Z [mno123pqr]
completed page /admin/roles at 2024-01-15T10:31:01.500Z [mno123pqr] (1500ms)
```

## Configuration

The logging system is automatically enabled and requires no additional configuration. All logs are output to the console with consistent formatting.

## Request IDs

Each request gets a unique ID that allows you to correlate start and completion logs, making it easy to track individual requests through the system.
