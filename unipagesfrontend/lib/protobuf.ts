import { Buffer } from 'buffer';

/**
 * Protocol Buffer Utility Library for UniPages
 * Provides serialization, deserialization, and type conversion functions
 */

export interface ProtobufSerializable {
  toArray(): Uint8Array;
  toBuffer(): Buffer;
  toJSON(): Record<string, any>;
}

export interface ProtobufDeserializable {
  fromArray(array: Uint8Array): this;
  fromBuffer(buffer: Buffer): this;
  fromJSON(json: Record<string, any>): this;
}

/**
 * Serialization utilities
 */
export class ProtobufUtils {
  /**
   * Convert a protobuf message to a base64 string
   */
  static toBase64(message: ProtobufSerializable): string {
    const buffer = message.toBuffer();
    return buffer.toString('base64');
  }

  /**
   * Convert a base64 string back to a protobuf message
   */
  static fromBase64<T extends ProtobufDeserializable>(
    base64: string,
    messageClass: new () => T
  ): T {
    const buffer = Buffer.from(base64, 'base64');
    const message = new messageClass();
    return message.fromBuffer(buffer);
  }

  /**
   * Convert a protobuf message to a URL-safe base64 string
   */
  static toUrlSafeBase64(message: ProtobufSerializable): string {
    const base64 = this.toBase64(message);
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }

  /**
   * Convert a URL-safe base64 string back to a protobuf message
   */
  static fromUrlSafeBase64<T extends ProtobufDeserializable>(
    urlSafeBase64: string,
    messageClass: new () => T
  ): T {
    let base64 = urlSafeBase64.replace(/-/g, '+').replace(/_/g, '/');
    // Add padding if needed
    while (base64.length % 4) {
      base64 += '=';
    }
    return this.fromBase64(base64, messageClass);
  }

  /**
   * Convert a protobuf message to a hex string
   */
  static toHex(message: ProtobufSerializable): string {
    const buffer = message.toBuffer();
    return buffer.toString('hex');
  }

  /**
   * Convert a hex string back to a protobuf message
   */
  static fromHex<T extends ProtobufDeserializable>(
    hex: string,
    messageClass: new () => T
  ): T {
    const buffer = Buffer.from(hex, 'hex');
    const message = new messageClass();
    return message.fromBuffer(buffer);
  }

  /**
   * Compress a protobuf message using gzip
   */
  static async compress(message: ProtobufSerializable): Promise<Uint8Array> {
    const buffer = message.toBuffer();
    
    // Use the Web Compression Streams API if available
    if (typeof CompressionStream !== 'undefined') {
      const stream = new CompressionStream('gzip');
      const writer = stream.writable.getWriter();
      const reader = stream.readable.getReader();
      
      await writer.write(buffer as any);
      await writer.close();
      
      const chunks: Uint8Array[] = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
      
      // Combine chunks
      const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
      const result = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
      }
      
      return result;
    }
    
    // Fallback: return uncompressed
    return buffer;
  }

  /**
   * Decompress a compressed protobuf message
   */
  static async decompress<T extends ProtobufDeserializable>(
    compressed: Uint8Array,
    messageClass: new () => T
  ): Promise<T> {
    // Use the Web Decompression Streams API if available
    if (typeof DecompressionStream !== 'undefined') {
      const stream = new DecompressionStream('gzip');
      const writer = stream.writable.getWriter();
      const reader = stream.readable.getReader();
      
      await writer.write(compressed as any);
      await writer.close();
      
      const chunks: Uint8Array[] = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
      
      // Combine chunks
      const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
      const result = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
      }
      
      const message = new messageClass();
      return message.fromArray(result);
    }
    
    // Fallback: assume uncompressed
    const message = new messageClass();
    return message.fromArray(compressed);
  }

  /**
   * Validate a protobuf message structure
   */
  static validateMessage(message: any): boolean {
    if (!message || typeof message !== 'object') {
      return false;
    }
    
    // Check if it has required protobuf methods
    if (typeof message.toArray !== 'function' ||
        typeof message.toBuffer !== 'function' ||
        typeof message.toJSON !== 'function') {
      return false;
    }
    
    return true;
  }

  /**
   * Deep clone a protobuf message
   */
  static clone<T extends ProtobufSerializable & ProtobufDeserializable>(
    message: T,
    messageClass: new () => T
  ): T {
    const json = message.toJSON();
    const cloned = new messageClass();
    return cloned.fromJSON(json);
  }

  /**
   * Merge two protobuf messages
   */
  static merge<T extends ProtobufSerializable & ProtobufDeserializable>(
    target: T,
    source: T,
    messageClass: new () => T
  ): T {
    const targetJson = target.toJSON();
    const sourceJson = source.toJSON();
    
    // Merge JSON objects
    const mergedJson = { ...targetJson, ...sourceJson };
    
    // Create new message from merged JSON
    const merged = new messageClass();
    return merged.fromJSON(mergedJson);
  }

  /**
   * Compare two protobuf messages for equality
   */
  static equals(message1: ProtobufSerializable, message2: ProtobufSerializable): boolean {
    if (message1 === message2) return true;
    
    try {
      const json1 = message1.toJSON();
      const json2 = message2.toJSON();
      
      return JSON.stringify(json1) === JSON.stringify(json2);
    } catch (error) {
      return false;
    }
  }

  /**
   * Get the size of a protobuf message in bytes
   */
  static getSize(message: ProtobufSerializable): number {
    try {
      const buffer = message.toBuffer();
      return buffer.length;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Convert timestamp to protobuf timestamp format
   */
  static toProtobufTimestamp(date: Date): { seconds: number; nanos: number } {
    const seconds = Math.floor(date.getTime() / 1000);
    const nanos = (date.getTime() % 1000) * 1000000;
    return { seconds, nanos };
  }

  /**
   * Convert protobuf timestamp to JavaScript Date
   */
  static fromProtobufTimestamp(timestamp: { seconds: number; nanos: number }): Date {
    const milliseconds = timestamp.seconds * 1000 + timestamp.nanos / 1000000;
    return new Date(milliseconds);
  }
}

/**
 * Type-safe protobuf message factory
 */
export class ProtobufFactory {
  private static instances = new Map<string, any>();

  /**
   * Register a protobuf message class
   */
  static register<T>(name: string, messageClass: new () => T): void {
    this.instances.set(name, messageClass);
  }

  /**
   * Create a new instance of a registered message class
   */
  static create<T>(name: string): T | null {
    const messageClass = this.instances.get(name);
    if (messageClass) {
      return new messageClass();
    }
    return null;
  }

  /**
   * Get a registered message class
   */
  static getClass<T>(name: string): (new () => T) | null {
    return this.instances.get(name) || null;
  }

  /**
   * Check if a message class is registered
   */
  static isRegistered(name: string): boolean {
    return this.instances.has(name);
  }

  /**
   * List all registered message classes
   */
  static listRegistered(): string[] {
    return Array.from(this.instances.keys());
  }
}

/**
 * Protobuf message cache for performance optimization
 */
export class ProtobufCache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

  /**
   * Set a cached protobuf message
   */
  set(key: string, data: any, ttl: number = 300000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  /**
   * Get a cached protobuf message
   */
  get(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  /**
   * Check if a key exists in cache
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Remove a key from cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cached data
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Export default instance
export const protobufUtils = new ProtobufUtils();
export const protobufFactory = new ProtobufFactory();
export const protobufCache = new ProtobufCache();
