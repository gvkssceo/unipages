export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 text-center">
      <div>
        <h1 className="text-2xl font-semibold mb-2">You’re offline</h1>
        <p className="text-muted-foreground">
          Check your connection. Some pages and static assets may still be available.
        </p>
      </div>
    </div>
  );
}


