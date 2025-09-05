// PHASE 1 OPTIMIZATION: Request deduplication utility to prevent duplicate API calls
class RequestCache {
  private cache = new Map<string, Promise<any>>();
  private readonly TTL = 5000; // 5 seconds
  
  async get<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    const existing = this.cache.get(key);
    if (existing) {
      console.log(`🔄 Request deduplication: reusing request for ${key}`);
      return existing;
    }
    
    const promise = fetcher().finally(() => {
      // Remove from cache after TTL
      setTimeout(() => {
        this.cache.delete(key);
      }, this.TTL);
    });
    
    this.cache.set(key, promise);
    return promise;
  }
  
  clear() {
    this.cache.clear();
  }
  
  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

export const requestCache = new RequestCache();
