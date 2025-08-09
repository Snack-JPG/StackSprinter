'use client';

interface EnvVar {
  name: string;
  present: boolean;
  value?: string;
}

function getEnvVars(): EnvVar[] {
  return [
    {
      name: 'NEXT_PUBLIC_SUPABASE_URL',
      present: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      value: process.env.NEXT_PUBLIC_SUPABASE_URL ? 
        `${process.env.NEXT_PUBLIC_SUPABASE_URL.slice(0, 20)}...` : undefined
    },
    {
      name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      present: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      value: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 
        `${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.slice(0, 20)}...` : undefined
    },
  ];
}

export function EnvStatus() {
  const envVars = getEnvVars();
  const allPresent = envVars.every(env => env.present);

  return (
    <div className="space-y-3">
      <div className={`flex items-center gap-2 ${allPresent ? 'text-green-600' : 'text-red-600'}`}>
        <div className={`w-3 h-3 rounded-full ${allPresent ? 'bg-green-500' : 'bg-red-500'}`} />
        <span className="font-medium">
          {allPresent ? 'All environment variables configured' : 'Missing environment variables'}
        </span>
      </div>
      
      <div className="space-y-2">
        {envVars.map((env) => (
          <div key={env.name} className="flex items-center justify-between text-sm">
            <code className="text-gray-700 bg-gray-100 px-2 py-1 rounded">
              {env.name}
            </code>
            <div className={`flex items-center gap-1 ${env.present ? 'text-green-600' : 'text-red-600'}`}>
              {env.present ? '✅' : '❌'}
              {env.value && <span className="text-gray-500">({env.value})</span>}
            </div>
          </div>
        ))}
      </div>
      
      {!allPresent && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
          <p className="text-sm text-yellow-800">
            Environment variables will be automatically set when deployed via StackSprinter.
          </p>
        </div>
      )}
    </div>
  );
}