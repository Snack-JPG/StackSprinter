'use client';

import { useState, useEffect } from 'react';

interface ExampleItem {
  id: number;
  label: string;
  created_at: string;
}

export function ExampleData() {
  const [data, setData] = useState<ExampleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('/api/examples');
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const examples = await response.json();
        setData(examples);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-gray-600">Connecting to database...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-red-600">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span className="font-medium">Database connection failed</span>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <p className="text-sm text-red-800">{error}</p>
          <p className="text-xs text-red-600 mt-1">
            Make sure Supabase environment variables are set correctly.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-green-600">
        <div className="w-3 h-3 rounded-full bg-green-500" />
        <span className="font-medium">Database connected successfully</span>
      </div>
      
      {data.length > 0 ? (
        <div className="space-y-2">
          <p className="text-sm text-gray-600">Sample data from examples table:</p>
          <div className="space-y-1">
            {data.slice(0, 3).map((item) => (
              <div key={item.id} className="bg-gray-50 px-3 py-2 rounded text-sm">
                <div className="flex justify-between items-center">
                  <span className="font-medium">{item.label}</span>
                  <span className="text-gray-500 text-xs">
                    {new Date(item.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
          {data.length > 3 && (
            <p className="text-xs text-gray-500">
              ... and {data.length - 3} more items
            </p>
          )}
        </div>
      ) : (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
          <p className="text-sm text-blue-800">
            Database is connected but no example data found. 
            Run the seed command to populate sample data.
          </p>
        </div>
      )}
    </div>
  );
}