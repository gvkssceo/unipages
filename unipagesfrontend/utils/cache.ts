// Simple in-memory cache utility for performance optimization
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class SimpleCache {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly defaultTTL = 30 * 60 * 1000; // 30 minutes (increased for better performance)
  
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }
  
  set<T>(key: string, data: T, ttl: number = this.defaultTTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }
  
  delete(key: string): void {
    this.cache.delete(key);
  }
  
  clear(): void {
    this.cache.clear();
  }
  
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }
  
  // Get cache statistics for monitoring
  getStats(): { size: number; hitRate: number; keys: string[] } {
    const now = Date.now();
    let validEntries = 0;
    const keys: string[] = [];
    
    for (const [key, entry] of this.cache.entries()) {
      keys.push(key);
      if (now - entry.timestamp <= entry.ttl) {
        validEntries++;
      }
    }
    
    return {
      size: validEntries,
      hitRate: 0, // This would need to be tracked separately
      keys
    };
  }
  
  // Warm cache with multiple entries
  warmCache(entries: Array<{ key: string; data: any; ttl?: number }>): void {
    entries.forEach(({ key, data, ttl }) => {
      this.set(key, data, ttl);
    });
  }
}

export const cache = new SimpleCache();

// Cleanup expired entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    // Simple cleanup by iterating and checking expiry
    const now = Date.now();
    for (const [key, entry] of (cache as any).cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        (cache as any).cache.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}
