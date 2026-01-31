type CacheEntry<T> = {
    data: T;
    expiry: number;
};

const cache = new Map<string, CacheEntry<any>>();
const MAX_CACHE_SIZE = 500;

export function getCache<T>(key: string): T | null {
    const entry = cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiry) {
        cache.delete(key);
        return null;
    }
    return entry.data;
}

export function setCache<T>(key: string, data: T, ttlMs: number): void {
    if (cache.size >= MAX_CACHE_SIZE) {
        // Simple FIFO: Remove the first (oldest) entry
        const firstKey = cache.keys().next().value;
        if (firstKey) cache.delete(firstKey);
    }
    
    cache.set(key, {
        data,
        expiry: Date.now() + ttlMs,
    });
}
