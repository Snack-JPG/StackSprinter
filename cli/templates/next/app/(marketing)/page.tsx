import { EnvStatus } from '../components/env-status';
import { ExampleData } from '../components/example-data';
import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="container mx-auto px-4 py-16">
      <div className="max-w-4xl mx-auto text-center">
        {/* Hero Section */}
        <div className="mb-16">
          <h1 className="text-6xl font-bold text-gray-900 mb-6">
            🚀 StackSprinter
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Your app is now live! This Next.js application was automatically deployed 
            with Supabase backend and Vercel hosting in seconds.
          </p>
          <div className="flex justify-center gap-4">
            <Link 
              href="/api/health"
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Check API Health
            </Link>
            <Link 
              href="https://github.com/stacksprinter/stacksprinter"
              className="border border-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-50 transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              View Source
            </Link>
          </div>
        </div>

        {/* Status Cards */}
        <div className="grid md:grid-cols-2 gap-8 mb-16">
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="text-2xl font-semibold mb-4">Environment Status</h2>
            <EnvStatus />
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="text-2xl font-semibold mb-4">Database Connection</h2>
            <ExampleData />
          </div>
        </div>

        {/* Tech Stack */}
        <div className="bg-white rounded-xl shadow-sm border p-8">
          <h2 className="text-2xl font-semibold mb-6">Your Tech Stack</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-black rounded-lg mx-auto mb-2 flex items-center justify-center">
                <span className="text-white font-bold">▲</span>
              </div>
              <h3 className="font-medium">Vercel</h3>
              <p className="text-sm text-gray-500">Hosting & Deployment</p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-green-600 rounded-lg mx-auto mb-2 flex items-center justify-center">
                <span className="text-white font-bold">S</span>
              </div>
              <h3 className="font-medium">Supabase</h3>
              <p className="text-sm text-gray-500">Database & Auth</p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-600 rounded-lg mx-auto mb-2 flex items-center justify-center">
                <span className="text-white font-bold">N</span>
              </div>
              <h3 className="font-medium">Next.js 14</h3>
              <p className="text-sm text-gray-500">React Framework</p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-cyan-500 rounded-lg mx-auto mb-2 flex items-center justify-center">
                <span className="text-white font-bold">T</span>
              </div>
              <h3 className="font-medium">Tailwind</h3>
              <p className="text-sm text-gray-500">CSS Framework</p>
            </div>
          </div>
        </div>

        {/* Next Steps */}
        <div className="mt-16 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-8">
          <h2 className="text-2xl font-semibold mb-4">Next Steps</h2>
          <div className="grid md:grid-cols-3 gap-6 text-left">
            <div>
              <h3 className="font-semibold mb-2">🎨 Customize</h3>
              <p className="text-sm text-gray-600">
                Edit the files in your project to customize the design and functionality
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">🗄️ Database</h3>
              <p className="text-sm text-gray-600">
                Add tables and data to your Supabase project via the dashboard
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">🚢 Deploy</h3>
              <p className="text-sm text-gray-600">
                Push changes to your GitHub repo for automatic Vercel deployments
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}