-- Seed data for examples table
insert into public.examples (label, description, category, metadata) values 
  (
    'Welcome to StackSprinter!', 
    'This is your first example record. Your app is now connected to Supabase and ready to store data.',
    'welcome',
    '{"priority": "high", "featured": true}'::jsonb
  ),
  (
    'Next.js API Routes', 
    'Your app includes pre-built API routes at /api/health and /api/examples for quick testing.',
    'api',
    '{"endpoints": ["/api/health", "/api/examples"]}'::jsonb
  ),
  (
    'Tailwind CSS Styling', 
    'Beautiful, responsive design with Tailwind CSS utility classes for rapid UI development.',
    'styling',
    '{"framework": "tailwindcss", "version": "3.x"}'::jsonb
  ),
  (
    'TypeScript Support', 
    'Full TypeScript support with proper types for Supabase queries and Next.js components.',
    'typescript',
    '{"features": ["strict mode", "type safety", "intellisense"]}'::jsonb
  ),
  (
    'Vercel Deployment', 
    'Automatic deployment to Vercel with environment variables configured for seamless production.',
    'deployment',
    '{"platform": "vercel", "environment": "production"}'::jsonb
  ),
  (
    'Database Migrations', 
    'Version-controlled database schema with Supabase migrations for consistent deployments.',
    'database',
    '{"features": ["migrations", "seed data", "RLS policies"]}'::jsonb
  ),
  (
    'Real-time Features', 
    'Ready for real-time subscriptions with Supabase for live data updates.',
    'realtime',
    '{"capabilities": ["subscriptions", "live queries", "websockets"]}'::jsonb
  ),
  (
    'Authentication Ready', 
    'Pre-configured user profiles table with auth triggers for user management.',
    'auth',
    '{"providers": ["email", "oauth"], "features": ["profiles", "RLS"]}'::jsonb
  ),
  (
    'File Storage', 
    'Supabase Storage bucket configured for user file uploads with proper security policies.',
    'storage',
    '{"bucket": "uploads", "policies": ["authenticated uploads", "public access"]}'::jsonb
  ),
  (
    'Development Ready', 
    'Local development setup with hot reloading, TypeScript checking, and database seeding.',
    'development',
    '{"tools": ["tsx", "tailwind", "typescript", "supabase cli"]}'::jsonb
  );

-- Update the metadata for better demonstration
update public.examples 
set metadata = metadata || '{"created_by": "stacksprinter", "version": "1.0.0"}'::jsonb
where category in ('welcome', 'deployment');

-- Add some variations in created_at for better demo
update public.examples 
set created_at = now() - interval '1 hour'
where label like '%API%';

update public.examples 
set created_at = now() - interval '2 hours'  
where label like '%Tailwind%';

update public.examples 
set created_at = now() - interval '30 minutes'
where label like '%TypeScript%';

-- Create a sample inactive record to test filtering
insert into public.examples (label, description, category, is_active, metadata) values 
  (
    'Legacy Feature', 
    'This is an example of an inactive feature that might be filtered out.',
    'archived',
    false,
    '{"status": "deprecated", "removal_date": "2024-12-31"}'::jsonb
  );

-- Add some helpful comments
comment on table public.examples is 'Contains seed data demonstrating StackSprinter capabilities and features';