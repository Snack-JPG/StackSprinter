# 🧪 Street Alchemy Website - StackSprinter Example

This example demonstrates creating a "Street Alchemy" website using StackSprinter - from concept to deployed application in seconds.

## 🎯 What We're Building

A fictional creative collective website featuring:
- Modern landing page with gradient animations
- Real-time project showcase from database
- Contact form with Supabase storage
- Responsive design with Tailwind CSS
- Full-stack deployment pipeline

## 🚀 One-Command Deployment

```bash
# Create the entire application and deploy it
pnpm dlx tsx cli/stacksprinter.ts create \
  --app-name "street-alchemy-website" \
  --org "my-vercel-org" \
  --github-org "my-github-org" \
  --visibility "public" \
  --region "us-west-1" \
  --verbose
```

This single command will:
1. ✅ Generate Next.js 14 app with TypeScript & Tailwind
2. ✅ Create Supabase project with PostgreSQL database
3. ✅ Run database migrations for profiles and examples tables
4. ✅ Seed database with street alchemy themed content
5. ✅ Create GitHub repository and push code
6. ✅ Deploy to Vercel with environment variables configured
7. ✅ Set up CI/CD pipeline with GitHub Actions

## 📊 Expected Output

```bash
🚀 Starting StackSprinter for "street-alchemy-website"

📁 Scaffolding Next.js application...
✅ Next.js application scaffolded

🗄️  Setting up Supabase project...
✅ Supabase project ready

📚 Creating GitHub repository...
✅ Code pushed to GitHub

🌐 Deploying to Vercel...
✅ Deployed to Vercel

🎉 StackSprinter completed in 45s!

📊 Your app is live:
   🌐 Website: https://street-alchemy-website.vercel.app
   📚 GitHub: https://github.com/my-github-org/street-alchemy-website
   🗄️  Supabase: https://supabase.com/dashboard/project/abcd1234
```

## 🔍 Verification

Verify your deployment is working:

```bash
./scripts/verify.sh --app-name "street-alchemy-website" --verbose
```

Expected verification results:
```bash
🔍 StackSprinter Verification
==============================
App Name: street-alchemy-website
Timeout: 30s

✅ Found state file: street-alchemy-website/.stacksprinter/state.json
ℹ️  Vercel URL: https://street-alchemy-website.vercel.app
ℹ️  Supabase Project: https://supabase.com/dashboard/project/abcd1234
ℹ️  GitHub Repository: https://github.com/my-github-org/street-alchemy-website

Testing health endpoint...
✅ Health endpoint responding correctly
ℹ️  Environment: production
ℹ️  Database: connected

Testing database connectivity...
✅ Database connected with 10 example records
ℹ️  Sample record: "Welcome to StackSprinter!"

Testing homepage accessibility...
✅ Homepage accessible (HTTP 200)

Checking SSL certificate...
✅ SSL certificate valid

Testing response time...
✅ Response time: 0.284s (fast)

🎉 Verification completed successfully!

Summary:
✅ Health endpoint: working
✅ Database: connected  
✅ Homepage: accessible
✅ Overall: healthy

🌐 Your StackSprinter app is live and working correctly!
URL: https://street-alchemy-website.vercel.app
```

## 🎨 Customizing the Street Alchemy Theme

After deployment, customize the app for the street alchemy theme:

### 1. Update the Landing Page

Edit `app/(marketing)/page.tsx`:

```tsx
export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="container mx-auto px-4 py-16">
        {/* Street Alchemy Hero */}
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 mb-6">
            🧪 Street Alchemy
          </h1>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Transforming urban experiences through creative chemistry. 
            Where art meets science on every street corner.
          </p>
          
          {/* Project Showcase */}
          <div className="grid md:grid-cols-3 gap-8 mt-16">
            <ProjectCard 
              title="Neon Reactions"
              description="Interactive light installations that respond to foot traffic"
              color="from-green-400 to-blue-500"
            />
            <ProjectCard 
              title="Sound Synthesis"
              description="Converting city sounds into visual art displays"  
              color="from-purple-400 to-pink-500"
            />
            <ProjectCard 
              title="Urban Gardens"
              description="Hydroponic systems integrated into street furniture"
              color="from-yellow-400 to-orange-500"
            />
          </div>
        </div>
      </div>
    </main>
  );
}
```

### 2. Add Custom Database Content

Create a new seed file `supabase/seed/street_alchemy.sql`:

```sql
-- Street Alchemy themed content
INSERT INTO public.examples (label, description, category, metadata) VALUES
  ('Neon Chemical Reactions', 'Interactive LED installations triggered by pedestrian movement', 'installations', '{"location": "downtown", "sensors": ["motion", "sound"], "colors": ["neon-green", "electric-blue"]}'),
  ('Urban Sound Lab', 'Real-time audio visualization using city ambient noise', 'audio', '{"equipment": ["hydrophones", "spectrum analyzers"], "locations": ["subway", "park", "intersection"]}'),
  ('Vertical Ecosystem', 'Self-sustaining hydroponic walls integrated into building facades', 'bioart', '{"plants": ["herbs", "microgreens"], "automation": ["pH sensors", "nutrient pumps"]}'),
  ('Street Symphony', 'Algorithmic music generation from traffic patterns', 'generative', '{"data_sources": ["traffic_count", "weather", "time_of_day"], "instruments": ["synthesizer", "field_recordings"]}'),
  ('Light Pollution Mapper', 'Community-driven light pollution documentation and art', 'data_viz', '{"sensors": ["light_meters", "cameras"], "output": ["heat_maps", "time_lapse"]}');
```

### 3. Set Up Real-time Features

Enable real-time subscriptions in `app/lib/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';

export function createRealtimeClient() {
  return createClient(supabaseUrl, supabaseAnonKey, {
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  });
}

// Subscribe to project updates
export function subscribeToProjects(callback: (payload: any) => void) {
  const supabase = createRealtimeClient();
  
  return supabase
    .channel('projects')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'examples',
      filter: 'category=in.(installations,audio,bioart,generative,data_viz)'
    }, callback)
    .subscribe();
}
```

## 🤖 Using MCP with Street Alchemy

Configure Claude to help manage the Street Alchemy database:

### 1. Setup MCP in Claude Desktop

```json
{
  "mcpServers": {
    "street-alchemy": {
      "command": "tsx",
      "args": ["/path/to/stacksprinter/mcp/tools.ts"],
      "env": {
        "SUPABASE_ACCESS_TOKEN": "your_token_here",
        "ALLOW_WRITE": "false"
      }
    }
  }
}
```

### 2. Example Claude Interactions

**Query project data:**
> "Show me all street alchemy installations in the database"

Claude will use `db_query_safe`:
```sql
SELECT label, description, metadata->>'location' as location 
FROM examples 
WHERE category = 'installations' 
ORDER BY created_at DESC
```

**Analyze project themes:**
> "What are the most common themes in our street alchemy projects?"

Claude will query and analyze the data to identify patterns in categories, metadata, and descriptions.

**Add new project (with write permissions):**
> "Add a new bioart project called 'Moss Networks' that uses IoT sensors to create living communication networks"

With `ALLOW_WRITE=true`, Claude can:
```sql
INSERT INTO examples (label, description, category, metadata) 
VALUES ('Moss Networks', 'IoT-enabled moss installations creating living communication networks', 'bioart', '{"sensors": ["humidity", "pH", "conductivity"], "network": "LoRaWAN"}')
```

## 📈 Scaling the Street Alchemy Website

### Performance Optimizations

1. **Image Optimization:**
   ```bash
   # Add to next.config.js
   images: {
     domains: ['your-supabase-project.supabase.co'],
     formats: ['image/webp', 'image/avif'],
   }
   ```

2. **Database Indexing:**
   ```sql
   -- Add indexes for common queries
   CREATE INDEX idx_examples_category ON examples(category);
   CREATE INDEX idx_examples_metadata_location ON examples USING gin((metadata->>'location'));
   ```

3. **Caching Strategy:**
   ```typescript
   // Use Next.js built-in caching
   export const revalidate = 60; // Revalidate every minute
   
   // Or implement Redis caching for database queries
   ```

### Advanced Features

1. **Real-time Collaboration:**
   - Live project status updates
   - Collaborative editing of project descriptions
   - Real-time visitor counting

2. **API Integration:**
   - Weather data for environmental installations
   - City transit APIs for movement-based art
   - Social media integration for community engagement

3. **Content Management:**
   - Admin panel for project management
   - File upload for project images/videos
   - Version control for project iterations

## 🎯 Business Impact

This Street Alchemy website demonstrates StackSprinter's power:

- **⚡ Speed:** Idea to deployed website in under 60 seconds
- **🏗️ Architecture:** Production-ready stack with best practices
- **🔒 Security:** Database RLS, environment variables, HTTPS
- **📊 Scalability:** Auto-scaling, CDN, real-time capabilities
- **🤖 AI Integration:** MCP enables AI-powered content management
- **💰 Cost-effective:** Free tier hosting with pay-as-you-scale

## 🔗 Next Steps

1. **Custom Domain:** Connect your domain via Vercel
2. **Analytics:** Add Vercel Analytics or Google Analytics  
3. **SEO:** Implement metadata and structured data
4. **Performance:** Optimize images and implement caching
5. **Community:** Add user authentication and project submissions

## 📞 Support

If you encounter issues with this example:

1. Check the [main README](../README.md) troubleshooting section
2. Verify all environment variables are set correctly
3. Use `--verbose` flag for detailed deployment logs
4. Open an issue on the StackSprinter repository

---

**This example shows how StackSprinter transforms creative ideas into live web applications instantly. From street alchemy to any concept you can imagine! 🧪✨**