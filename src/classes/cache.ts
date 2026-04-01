import crypto from "node:crypto";
import { createCache } from "cache-manager";
import { Keyv } from "keyv";
import { LRUCache } from "lru-cache";

const keyv = new Keyv({ store: new LRUCache({ max: 500 }) });
const cache = createCache({ stores: [keyv] });

export class CacheManager {
	/** The singleton instance of the cache manager. */
	private static instance: CacheManager;
	/** The cache manager instance. */
	private static cache: ReturnType<typeof createCache> = cache;

	/** The set of keys in the cache, needed because keyv doesn't support listing keys. */
	private keysSet: Set<string> = new Set();

	private constructor() {
		void 0;
	}

	/**
	 * Hashes a key using SHA-256.
	 * @param key The key to hash
	 * @returns The hashed key
	 */
	public static hashKey(key: string): string {
		return crypto.createHash("sha256").update(key).digest("hex");
	}

	/**
	 * Hashes an object using SHA-256, uses `JSON.stringify` to convert the object to a string.
	 * @param obj The object to hash
	 * @returns The hashed key for the object
	 */
	public static hashKeyFromObject(obj: unknown): string {
		if (typeof obj === "string") {
			return CacheManager.hashKey(obj);
		}

		return CacheManager.hashKey(JSON.stringify(obj));
	}

	/**
	 * @returns The singleton instance of the cache manager.
	 */
	public static getInstance(): CacheManager {
		if (!CacheManager.instance) {
			CacheManager.instance = new CacheManager();
		}
		return CacheManager.instance;
	}

	/**
	 * Deserialization helper for {@link JSON.parse} to handle dates.
	 * @param _key The key of the value, unused
	 * @param value The value to deserialize
	 * @returns The deserialized value
	 */
	private static deserializationHelper(_key: string, value: unknown) {
		if (typeof value === "string") {
			const regexp = /^\d\d\d\d-\d\d-\d\dT\d\d:\d\d:\d\d.\d\d\dZ$/.exec(value);
			if (regexp) {
				return new Date(value);
			}
		}
		return value;
	}

	/**
	 * Retrieves data from the cache, by it's key.
	 * @param key The key to retrieve the data for
	 * @returns The data for the key, or `null` if it doesn't exist
	 */
	public async get<T>(key: string): Promise<T | null> {
		const value = await CacheManager.cache.get<string>(key);

		if (typeof value === "undefined") {
			return null;
		}

		return JSON.parse(value, CacheManager.deserializationHelper) as T;
	}

	/**
	 * Sets data in the cache, by it's key.
	 * @param key
	 * @param value
	 * @param ttl
	 */
	public async set<T>(key: string, value: T, ttl: number): Promise<void> {
		await CacheManager.cache.set(key, JSON.stringify(value), ttl);
		this.keysSet.add(key);
	}

	/**
	 * Deletes data from the cache, by it's key.
	 * @param key The key to delete the data for
	 * @returns Whether the key existed in the cache
	 */
	public async del(key: string): Promise<boolean> {
		const result = await CacheManager.cache.del(key);
		this.keysSet.delete(key);
		return result;
	}

	/**
	 * Clears all data from the cache.
	 * @returns Whether the cache was cleared
	 */
	public async clear(): Promise<boolean> {
		const result = await CacheManager.cache.clear();
		this.keysSet.clear();
		return result;
	}

	/**
	 * @returns All keys in the cache
	 */
	public async keys(): Promise<string[]> {
		return Array.from(this.keysSet);
	}

	/**
	 * Checks if a key exists in the cache.
	 * @param key The key to check for
	 * @returns Whether the key exists in the cache
	 */
	public async has(key: string): Promise<boolean> {
		return this.keysSet.has(key);
	}

	/**
	 * @returns The number of keys in the cache
	 */
	public async size(): Promise<number> {
		return this.keysSet.size;
	}

	/**
	 * Sets/categories should be tracked by using prefixes (e.g. `'categoryName:categoryKey'`)
	 * This method returns all keys that match the given prefix.
	 */
	public async keysForPrefix(prefix: string): Promise<string[]> {
		return Array.from(this.keysSet).filter((key) => key.startsWith(prefix));
	}

	/**
	 * Enforces a maximum size for a set/category of keys by deleting the oldest keys if the size exceeds the maximum.
	 * The keys should be tracked by using prefixes (e.g. `'categoryName:categoryKey'`)
	 * @param prefix The prefix to use for filtering keys
	 * @param maxSize The maximum size to enforce
	 * @returns Promise<void>
	 */
	public async enforceMaxSizeForPrefix(
		prefix: string,
		maxSize: number,
	): Promise<void> {
		const keys = await this.keysForPrefix(prefix);
		if (keys.length > maxSize) {
			const keysToDelete = keys.slice(0, keys.length - maxSize);
			await Promise.all(keysToDelete.map((key) => this.del(key)));
		}
	}

	/**
	 * Clears all entries that match the given prefix
	 * @param prefix The prefix to use for filtering keys
	 */
	public async clearPrefixEntries(prefix: string): Promise<void> {
		const keys = await this.keysForPrefix(prefix);
		await Promise.all(keys.map((key) => this.del(key)));
	}
}
