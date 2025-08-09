import { copyFileSync, mkdirSync, writeFileSync, existsSync, readdirSync, statSync } from 'fs';
import { resolve, join, dirname } from 'path';
import { log, LogLevel } from './log.js';

export async function scaffoldNextApp(appName: string, targetPath: string): Promise<void> {
  const templatePath = resolve(__dirname, '../templates/next');
  
  if (!existsSync(templatePath)) {
    throw new Error(`Template path not found: ${templatePath}`);
  }
  
  log('Scaffolding Next.js application...', LogLevel.DEBUG);
  
  // Create target directory
  mkdirSync(targetPath, { recursive: true });
  
  // Copy template files
  await copyDirectory(templatePath, targetPath);
  
  // Create package.json with project-specific name
  const packageJson = {
    name: appName.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
    version: '0.1.0',
    private: true,
    scripts: {
      dev: 'next dev',
      build: 'next build',
      start: 'next start',
      lint: 'next lint',
      typecheck: 'tsc --noEmit'
    },
    dependencies: {
      '@supabase/ssr': '^0.5.1',
      '@supabase/supabase-js': '^2.45.4',
      next: '14.2.13',
      react: '^18.3.1',
      'react-dom': '^18.3.1'
    },
    devDependencies: {
      '@types/node': '^20.16.10',
      '@types/react': '^18.3.11',
      '@types/react-dom': '^18.3.0',
      autoprefixer: '^10.4.20',
      eslint: '^8.57.1',
      'eslint-config-next': '14.2.13',
      postcss: '^8.4.47',
      tailwindcss: '^3.4.13',
      typescript: '^5.6.2'
    },
    engines: {
      node: '>=18.0.0'
    }
  };
  
  writeFileSync(
    join(targetPath, 'package.json'),
    JSON.stringify(packageJson, null, 2)
  );
  
  // Create .env.local template
  const envTemplate = `# Environment variables for ${appName}
# These will be set automatically by StackSprinter

NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_PROJECT_REF=your_supabase_project_ref
`;
  
  writeFileSync(join(targetPath, '.env.local.template'), envTemplate);
  
  log(`Next.js application scaffolded at ${targetPath}`, LogLevel.DEBUG);
}

export async function copyDirectory(source: string, target: string): Promise<void> {
  mkdirSync(target, { recursive: true });
  
  const items = readdirSync(source);
  
  for (const item of items) {
    const sourcePath = join(source, item);
    const targetPath = join(target, item);
    const stats = statSync(sourcePath);
    
    if (stats.isDirectory()) {
      await copyDirectory(sourcePath, targetPath);
    } else {
      // Ensure target directory exists
      mkdirSync(dirname(targetPath), { recursive: true });
      copyFileSync(sourcePath, targetPath);
    }
  }
}

export async function createFile(filePath: string, content: string): Promise<void> {
  const dir = dirname(filePath);
  mkdirSync(dir, { recursive: true });
  writeFileSync(filePath, content);
  log(`Created file: ${filePath}`, LogLevel.DEBUG);
}

export async function ensureDirectoryExists(dirPath: string): Promise<void> {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
    log(`Created directory: ${dirPath}`, LogLevel.DEBUG);
  }
}

export function replaceInFile(filePath: string, replacements: Record<string, string>): void {
  if (!existsSync(filePath)) {
    log(`File not found for replacement: ${filePath}`, LogLevel.WARN);
    return;
  }
  
  const { readFileSync } = require('fs');
  let content = readFileSync(filePath, 'utf-8');
  
  for (const [search, replace] of Object.entries(replacements)) {
    content = content.replace(new RegExp(search, 'g'), replace);
  }
  
  writeFileSync(filePath, content);
  log(`Updated file: ${filePath}`, LogLevel.DEBUG);
}

export function fileExists(filePath: string): boolean {
  return existsSync(filePath);
}

export function getFileSize(filePath: string): number {
  if (!existsSync(filePath)) {
    return 0;
  }
  
  const stats = statSync(filePath);
  return stats.size;
}

export function listFiles(dirPath: string, extension?: string): string[] {
  if (!existsSync(dirPath)) {
    return [];
  }
  
  const files: string[] = [];
  
  function walkDirectory(currentPath: string) {
    const items = readdirSync(currentPath);
    
    for (const item of items) {
      const fullPath = join(currentPath, item);
      const stats = statSync(fullPath);
      
      if (stats.isDirectory()) {
        walkDirectory(fullPath);
      } else if (!extension || item.endsWith(extension)) {
        files.push(fullPath);
      }
    }
  }
  
  walkDirectory(dirPath);
  return files;
}

export async function createNextConfig(projectPath: string): Promise<void> {
  const nextConfigContent = `/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000'],
    },
  },
  images: {
    domains: [],
    unoptimized: process.env.NODE_ENV === 'development',
  },
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
}

module.exports = nextConfig
`;

  const configPath = join(projectPath, 'next.config.js');
  writeFileSync(configPath, nextConfigContent);
  log('Created next.config.js', LogLevel.DEBUG);
}

export async function createTailwindConfig(projectPath: string): Promise<void> {
  const tailwindConfigContent = `/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [],
}
`;

  const configPath = join(projectPath, 'tailwind.config.js');
  writeFileSync(configPath, tailwindConfigContent);
  log('Created tailwind.config.js', LogLevel.DEBUG);
}

export async function createPostCSSConfig(projectPath: string): Promise<void> {
  const postCSSConfigContent = `module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
`;

  const configPath = join(projectPath, 'postcss.config.js');
  writeFileSync(configPath, postCSSConfigContent);
  log('Created postcss.config.js', LogLevel.DEBUG);
}