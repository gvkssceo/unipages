'use client';

import React, { useState, useEffect } from 'react';
import { userApiClient } from '@/lib/protobuf-api-client';
import { ProtobufUtils, protobufCache } from '@/lib/protobuf';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

/**
 * Example component demonstrating Protocol Buffer usage in UniPages
 */
export default function ProtobufExample() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useProtobuf, setUseProtobuf] = useState(true);
  const [cacheStats, setCacheStats] = useState<any>(null);
  const [performanceMetrics, setPerformanceMetrics] = useState<any>({});

  // Fetch users with performance measurement
  const fetchUsers = async (useProtobufFormat: boolean = true) => {
    setLoading(true);
    setError(null);
    
    const startTime = performance.now();
    
    try {
      const response = await userApiClient.get('/users', {
        useProtobuf: useProtobufFormat,
        useCompression: true,
        useCache: true,
        cacheKey: `users_${useProtobufFormat ? 'protobuf' : 'json'}`
      });
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      setUsers(response.data as any[]);
      setPerformanceMetrics({
        format: useProtobufFormat ? 'Protobuf' : 'JSON',
        duration: `${duration.toFixed(2)}ms`,
        dataSize: JSON.stringify(response.data).length,
        cached: response.headers['x-cache'] === 'HIT'
      });
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  // Clear cache
  const clearCache = () => {
    protobufCache.clear();
    setCacheStats(protobufCache.getStats());
  };

  // Get cache statistics
  const getCacheStats = () => {
    setCacheStats(protobufCache.getStats());
  };

  // Test protobuf utilities
  const testProtobufUtils = () => {
    const testData = {
      id: 'test-123',
      username: 'test_user',
      email: 'test@example.com',
      timestamp: new Date().toISOString()
    };

    // Simulate protobuf serialization (in real usage, you'd use generated classes)
    const mockProtobufMessage = {
      toArray: () => new TextEncoder().encode(JSON.stringify(testData)),
      toBuffer: () => Buffer.from(JSON.stringify(testData)),
      toJSON: () => testData
    };

    try {
      const base64 = ProtobufUtils.toBase64(mockProtobufMessage);
      const hex = ProtobufUtils.toHex(mockProtobufMessage);
      const size = ProtobufUtils.getSize(mockProtobufMessage);
      
      console.log('Protobuf utility test results:', {
        base64: base64.substring(0, 20) + '...',
        hex: hex.substring(0, 20) + '...',
        size: `${size} bytes`
      });
      
      alert(`Protobuf utilities working!\nBase64: ${base64.substring(0, 20)}...\nSize: ${size} bytes`);
    } catch (err) {
      console.error('Protobuf utility test failed:', err);
      alert('Protobuf utility test failed. Check console for details.');
    }
  };

  // Load initial data
  useEffect(() => {
    fetchUsers(true);
    getCacheStats();
  }, []);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Protocol Buffers Example</h1>
          <p className="text-gray-600 mt-2">
            Demonstrating protobuf integration in UniPages
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Badge variant={useProtobuf ? 'default' : 'secondary'}>
            {useProtobuf ? 'Protobuf' : 'JSON'}
          </Badge>
          <Button
            variant="outline"
            onClick={() => setUseProtobuf(!useProtobuf)}
          >
            Switch to {useProtobuf ? 'JSON' : 'Protobuf'}
          </Button>
        </div>
      </div>

      {/* Performance Metrics */}
      {Object.keys(performanceMetrics).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Performance Metrics</CardTitle>
            <CardDescription>Last API call performance data</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-500">Format</p>
                <p className="font-semibold">{performanceMetrics.format}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Duration</p>
                <p className="font-semibold">{performanceMetrics.duration}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Data Size</p>
                <p className="font-semibold">{performanceMetrics.dataSize} chars</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Cached</p>
                <p className="font-semibold">
                  {performanceMetrics.cached ? 'Yes' : 'No'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cache Management */}
      <Card>
        <CardHeader>
          <CardTitle>Cache Management</CardTitle>
          <CardDescription>Protobuf message caching</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <Button onClick={() => fetchUsers(useProtobuf)} disabled={loading}>
              {loading ? <LoadingSpinner /> : 'Fetch Users'}
            </Button>
            <Button variant="outline" onClick={getCacheStats}>
              Refresh Stats
            </Button>
            <Button variant="destructive" onClick={clearCache}>
              Clear Cache
            </Button>
            <Button variant="outline" onClick={testProtobufUtils}>
              Test Utils
            </Button>
          </div>
          
          {cacheStats && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-semibold mb-2">Cache Statistics</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Size:</span>
                  <span className="ml-2 font-mono">{cacheStats.size}</span>
                </div>
                <div>
                  <span className="text-gray-600">Keys:</span>
                  <span className="ml-2 font-mono">{cacheStats.keys.length}</span>
                </div>
              </div>
              {cacheStats.keys.length > 0 && (
                <div className="mt-2">
                  <span className="text-gray-600">Cached Keys:</span>
                  <div className="mt-1 space-x-2">
                    {cacheStats.keys.map((key: string) => (
                      <Badge key={key} variant="outline" className="text-xs">
                        {key}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2 text-red-700">
              <span className="text-red-500">⚠️</span>
              <span className="font-medium">Error:</span>
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Users Display */}
      <Card>
        <CardHeader>
          <CardTitle>Users ({users.length})</CardTitle>
          <CardDescription>
            Fetched using {useProtobuf ? 'Protocol Buffers' : 'JSON'} format
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner />
              <span className="ml-2">Loading users...</span>
            </div>
          ) : users.length > 0 ? (
            <div className="space-y-3">
              {users.slice(0, 5).map((user: any) => (
                <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{user.name || user.username}</p>
                    <p className="text-sm text-gray-600">{user.email}</p>
                    {user.phone && (
                      <p className="text-sm text-gray-500">📞 {user.phone}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <Badge variant={user.enabled ? 'default' : 'secondary'}>
                      {user.enabled ? 'Active' : 'Inactive'}
                    </Badge>
                    {user.roles && user.roles.length > 0 && (
                      <div className="mt-1">
                        {user.roles.slice(0, 2).map((role: string) => (
                          <Badge key={role} variant="outline" className="text-xs mr-1">
                            {role}
                          </Badge>
                        ))}
                        {user.roles.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{user.roles.length - 2}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {users.length > 5 && (
                <p className="text-center text-gray-500 text-sm">
                  Showing 5 of {users.length} users
                </p>
              )}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">No users found</p>
          )}
        </CardContent>
      </Card>

      {/* Information */}
      <Card>
        <CardHeader>
          <CardTitle>About Protocol Buffers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm max-w-none">
            <p>
              Protocol Buffers provide several benefits over traditional JSON:
            </p>
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li><strong>Smaller data size:</strong> Binary format reduces payload size by 30-50%</li>
              <li><strong>Faster parsing:</strong> Binary deserialization is 2-10x faster than JSON</li>
              <li><strong>Type safety:</strong> Schema-driven validation prevents runtime errors</li>
              <li><strong>Backward compatibility:</strong> Schema evolution without breaking changes</li>
              <li><strong>Better compression:</strong> Binary data compresses more efficiently</li>
            </ul>
            <p className="mt-4 text-sm text-gray-600">
              This example demonstrates dual-format support, allowing gradual migration from JSON to protobuf
              while maintaining backward compatibility.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
