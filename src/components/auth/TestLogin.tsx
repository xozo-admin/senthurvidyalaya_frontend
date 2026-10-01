'use client';

import { useState } from 'react';
import { api } from '@/lib/api';

export const TestLogin = () => {
  const [testData, setTestData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testLogin = async () => {
    setLoading(true);
    try {
      // Test with dummy credentials - adjust based on your API
      const response = await fetch('https://senthurvidyalaya-backend.onrender.com/api/accounts/login/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'test',
          password: 'test123'
        })
      });
      
      const data = await response.json();
      setTestData({
        status: response.status,
        ok: response.ok,
        data
      });
      console.log('Raw API Test Response:', data);
    } catch (error) {
      setTestData({ error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-4 p-4 border rounded-lg">
      <button
        onClick={testLogin}
        disabled={loading}
        className="px-4 py-2 bg-gray-800 text-white rounded"
      >
        {loading ? 'Testing...' : 'Test Login API'}
      </button>
      
      {testData && (
        <div className="mt-2 p-2 bg-gray-100 rounded text-sm">
          <pre>{JSON.stringify(testData, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};