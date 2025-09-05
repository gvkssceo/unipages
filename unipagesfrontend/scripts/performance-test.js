#!/usr/bin/env node

/**
 * Performance Test Script
 * Tests the performance improvements made to the UniPages application
 */

const https = require('https');
const http = require('http');

const BASE_URL = process.env.TEST_URL || 'http://localhost:5012';
const TEST_ITERATIONS = 5;

class PerformanceTester {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.results = {
      users: [],
      stats: [],
      admin: []
    };
  }

  async makeRequest(path) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const url = `${this.baseUrl}${path}`;
      
      const request = (url.startsWith('https') ? https : http).get(url, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          const endTime = Date.now();
          const responseTime = endTime - startTime;
          
          resolve({
            statusCode: res.statusCode,
            responseTime,
            dataLength: data.length,
            success: res.statusCode >= 200 && res.statusCode < 300
          });
        });
      });
      
      request.on('error', (error) => {
        reject(error);
      });
      
      request.setTimeout(30000, () => {
        request.destroy();
        reject(new Error('Request timeout'));
      });
    });
  }

  async testEndpoint(endpoint, iterations = TEST_ITERATIONS) {
    console.log(`\n🧪 Testing ${endpoint} (${iterations} iterations)...`);
    const times = [];
    
    for (let i = 0; i < iterations; i++) {
      try {
        const result = await this.makeRequest(endpoint);
        if (result.success) {
          times.push(result.responseTime);
          console.log(`  ✅ Request ${i + 1}: ${result.responseTime}ms`);
        } else {
          console.log(`  ❌ Request ${i + 1}: Failed (${result.statusCode})`);
        }
      } catch (error) {
        console.log(`  ❌ Request ${i + 1}: Error - ${error.message}`);
      }
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    if (times.length > 0) {
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const minTime = Math.min(...times);
      const maxTime = Math.max(...times);
      
      console.log(`  📊 Results for ${endpoint}:`);
      console.log(`     Average: ${avgTime.toFixed(2)}ms`);
      console.log(`     Min: ${minTime}ms`);
      console.log(`     Max: ${maxTime}ms`);
      
      return { avgTime, minTime, maxTime, times };
    }
    
    return null;
  }

  async runTests() {
    console.log('🚀 Starting Performance Tests...');
    console.log(`📍 Testing against: ${this.baseUrl}`);
    
    // Test critical endpoints
    const endpoints = [
      { path: '/api/admin/users', name: 'users' },
      { path: '/api/admin/stats', name: 'stats' },
      { path: '/admin', name: 'admin' }
    ];
    
    for (const endpoint of endpoints) {
      const result = await this.testEndpoint(endpoint.path);
      if (result) {
        this.results[endpoint.name] = result;
      }
    }
    
    this.printSummary();
  }

  printSummary() {
    console.log('\n📈 Performance Test Summary');
    console.log('============================');
    
    Object.entries(this.results).forEach(([endpoint, data]) => {
      if (data) {
        console.log(`\n${endpoint.toUpperCase()}:`);
        console.log(`  Average Response Time: ${data.avgTime.toFixed(2)}ms`);
        console.log(`  Best Performance: ${data.minTime}ms`);
        console.log(`  Worst Performance: ${data.maxTime}ms`);
        
        // Performance assessment
        if (data.avgTime < 1000) {
          console.log(`  🟢 EXCELLENT (< 1s)`);
        } else if (data.avgTime < 3000) {
          console.log(`  🟡 GOOD (< 3s)`);
        } else if (data.avgTime < 5000) {
          console.log(`  🟠 ACCEPTABLE (< 5s)`);
        } else {
          console.log(`  🔴 NEEDS IMPROVEMENT (> 5s)`);
        }
      }
    });
    
    console.log('\n💡 Performance Tips:');
    console.log('  - Cache hit rates should be > 80%');
    console.log('  - API responses should be < 2s');
    console.log('  - Page loads should be < 3s');
    console.log('  - Use ?refresh=true to bypass cache for testing');
  }
}

// Run the tests
const tester = new PerformanceTester(BASE_URL);
tester.runTests().catch(console.error);
