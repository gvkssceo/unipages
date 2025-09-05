import { ProtobufUtils, protobufCache } from './protobuf';

/**
 * Protocol Buffer Enhanced API Client for UniPages
 * Supports both JSON and protobuf data formats for optimal performance
 */

export interface ApiClientConfig {
  baseUrl: string;
  timeout?: number;
  enableProtobuf?: boolean;
  enableCompression?: boolean;
  enableCaching?: boolean;
  cacheTTL?: number;
  headers?: Record<string, string>;
}

export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  timeout?: number;
  useProtobuf?: boolean;
  useCompression?: boolean;
  useCache?: boolean;
  cacheKey?: string;
}

export interface ApiResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  ok: boolean;
}

export class ProtobufApiClient {
  private config: ApiClientConfig;
  private defaultHeaders: Record<string, string>;

  constructor(config: ApiClientConfig) {
    this.config = {
      timeout: 30000,
      enableProtobuf: true,
      enableCompression: true,
      enableCaching: true,
      cacheTTL: 300000, // 5 minutes
      ...config
    };

    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json, application/x-protobuf',
      'Accept-Encoding': 'gzip, deflate',
      ...config.headers
    };
  }

  /**
   * Make a GET request
   */
  async get<T>(
    endpoint: string,
    options: ApiRequestOptions = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'GET',
      ...options
    });
  }

  /**
   * Make a POST request
   */
  async post<T>(
    endpoint: string,
    data?: any,
    options: ApiRequestOptions = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      data,
      ...options
    });
  }

  /**
   * Make a PUT request
   */
  async put<T>(
    endpoint: string,
    data?: any,
    options: ApiRequestOptions = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      data,
      ...options
    });
  }

  /**
   * Make a DELETE request
   */
  async delete<T>(
    endpoint: string,
    options: ApiRequestOptions = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
      ...options
    });
  }

  /**
   * Make a PATCH request
   */
  async patch<T>(
    endpoint: string,
    data?: any,
    options: ApiRequestOptions = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      data,
      ...options
    });
  }

  /**
   * Core request method
   */
  private async request<T>(
    endpoint: string,
    options: ApiRequestOptions & { data?: any }
  ): Promise<ApiResponse<T>> {
    const {
      method = 'GET',
      headers = {},
      timeout = this.config.timeout,
      useProtobuf = this.config.enableProtobuf,
      useCompression = this.config.enableCompression,
      useCache = this.config.enableCaching,
      cacheKey,
      data
    } = options;

    // Check cache for GET requests
    if (method === 'GET' && useCache && cacheKey) {
      const cached = protobufCache.get(cacheKey);
      if (cached) {
        return {
          data: cached.data,
          status: 200,
          statusText: 'OK (Cached)',
          headers: { 'x-cache': 'HIT' },
          ok: true
        };
      }
    }

    // Prepare request headers
    const requestHeaders = {
      ...this.defaultHeaders,
      ...headers
    };

    // Set protobuf headers if enabled
    if (useProtobuf && data) {
      requestHeaders['Content-Type'] = 'application/x-protobuf';
      requestHeaders['Accept'] = 'application/x-protobuf, application/json';
    }

    // Set compression headers if enabled
    if (useCompression) {
      requestHeaders['Accept-Encoding'] = 'gzip, deflate';
    }

    // Prepare request body
    let requestBody: string | Uint8Array | undefined;
    if (data) {
      if (useProtobuf && typeof data.toArray === 'function') {
        // Convert protobuf message to binary
        requestBody = data.toArray();
        if (useCompression) {
          requestBody = await ProtobufUtils.compress(data);
        }
      } else {
        // Convert to JSON
        requestBody = JSON.stringify(data);
      }
    }

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(`${this.config.baseUrl}${endpoint}`, {
        method,
        headers: requestHeaders,
        body: requestBody as any,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // Parse response
      let responseData: T;
      const contentType = response.headers.get('content-type') || '';

      if (contentType.includes('application/x-protobuf') && useProtobuf) {
        // Handle protobuf response
        const arrayBuffer = await response.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        
        // Check if response is compressed
        if (response.headers.get('content-encoding') === 'gzip') {
          responseData = await ProtobufUtils.decompress(uint8Array, {} as any) as T;
        } else {
          responseData = uint8Array as any;
        }
      } else {
        // Handle JSON response
        responseData = await response.json();
      }

      // Cache successful GET responses
      if (method === 'GET' && useCache && cacheKey && response.ok) {
        protobufCache.set(cacheKey, responseData, this.config.cacheTTL);
      }

      return {
        data: responseData,
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        ok: response.ok
      };

    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error(`Request timeout after ${timeout}ms`);
        }
        throw error;
      }
      
      throw new Error('Request failed');
    }
  }

  /**
   * Upload file with protobuf metadata
   */
  async uploadFile<T>(
    endpoint: string,
    file: File,
    metadata?: any,
    options: ApiRequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const formData = new FormData();
    formData.append('file', file);

    if (metadata) {
      if (this.config.enableProtobuf && typeof metadata.toArray === 'function') {
        // Convert protobuf metadata to base64
        const base64 = ProtobufUtils.toBase64(metadata);
        formData.append('metadata', base64);
        formData.append('metadataFormat', 'protobuf');
      } else {
        // Use JSON metadata
        formData.append('metadata', JSON.stringify(metadata));
        formData.append('metadataFormat', 'json');
      }
    }

    return this.request<T>(endpoint, {
      method: 'POST',
      data: formData,
      headers: {
        // Don't set Content-Type for FormData
        'Content-Type': undefined as any
      },
      ...options
    });
  }

  /**
   * Download file with protobuf metadata
   */
  async downloadFile(
    endpoint: string,
    options: ApiRequestOptions = {}
  ): Promise<{ data: Blob; metadata?: any }> {
    const response = await this.request<Blob>(endpoint, {
      method: 'GET',
      ...options
    });

    let metadata: any;
    const metadataHeader = response.headers['x-metadata'];
    
    if (metadataHeader) {
      const metadataFormat = response.headers['x-metadata-format'];
      
      if (metadataFormat === 'protobuf') {
        // Parse protobuf metadata from base64
        metadata = ProtobufUtils.fromBase64(metadataHeader, {} as any);
      } else {
        // Parse JSON metadata
        metadata = JSON.parse(metadataHeader);
      }
    }

    return {
      data: response.data,
      metadata
    };
  }

  /**
   * Batch multiple requests
   */
  async batch<T>(
    requests: Array<{
      endpoint: string;
      method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
      data?: any;
      options?: ApiRequestOptions;
    }>,
    options: ApiRequestOptions = {}
  ): Promise<ApiResponse<T>[]> {
    const promises = requests.map(({ endpoint, method, data, options: reqOptions }) => {
      return this.request<T>(endpoint, {
        method,
        data,
        ...options,
        ...reqOptions
      });
    });

    return Promise.all(promises);
  }

  /**
   * Stream response data
   */
  async stream<T>(
    endpoint: string,
    options: ApiRequestOptions = {}
  ): Promise<ReadableStream<T>> {
    const response = await fetch(`${this.config.baseUrl}${endpoint}`, {
      method: options.method || 'GET',
      headers: {
        ...this.defaultHeaders,
        ...options.headers
      }
    });

    if (!response.body) {
      throw new Error('Response body is not readable');
    }

    // Transform the stream to parse protobuf or JSON chunks
    return response.body.pipeThrough(
      new TransformStream({
        transform(chunk, controller) {
          // Parse chunk based on content type
          // This is a simplified example - you'd need to implement proper streaming protobuf parsing
          try {
            const text = new TextDecoder().decode(chunk);
            const data = JSON.parse(text);
            controller.enqueue(data);
          } catch (error) {
            // Handle binary/protobuf chunks
            controller.enqueue(chunk as any);
          }
        }
      })
    );
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    protobufCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return protobufCache.getStats();
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<ApiClientConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

/**
 * Create a default API client instance
 */
export const createApiClient = (config: ApiClientConfig) => {
  return new ProtobufApiClient(config);
};

/**
 * Default API client for UniPages
 */
export const apiClient = new ProtobufApiClient({
  baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5012/api',
  enableProtobuf: true,
  enableCompression: true,
  enableCaching: true,
  cacheTTL: 300000, // 5 minutes
  headers: {
    'X-Client-Version': '1.0.0',
    'X-Client-Type': 'unipages-admin'
  }
});

/**
 * Specialized API clients for different domains
 */
export const userApiClient = new ProtobufApiClient({
  baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5012/api/admin',
  enableProtobuf: true,
  enableCompression: true,
  enableCaching: true,
  cacheTTL: 60000, // 1 minute for user data
  headers: {
    'X-API-Domain': 'users',
    'X-Client-Version': '1.0.0'
  }
});

export const roleApiClient = new ProtobufApiClient({
  baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5012/api/admin',
  enableProtobuf: true,
  enableCompression: true,
  enableCaching: true,
  cacheTTL: 300000, // 5 minutes for role data
  headers: {
    'X-API-Domain': 'roles',
    'X-Client-Version': '1.0.0'
  }
});

export const profileApiClient = new ProtobufApiClient({
  baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5012/api/admin',
  enableProtobuf: true,
  enableCompression: true,
  enableCaching: true,
  cacheTTL: 300000, // 5 minutes for profile data
  headers: {
    'X-API-Domain': 'profiles',
    'X-Client-Version': '1.0.0'
  }
});
