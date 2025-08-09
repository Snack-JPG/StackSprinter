import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';

export async function GET() {
  try {
    const supabase = createClient();
    
    // Test database connection with a simple query
    const { error } = await supabase
      .from('examples')
      .select('count')
      .limit(1);

    if (error) {
      return NextResponse.json(
        { 
          ok: false, 
          error: 'Database connection failed',
          details: error.message 
        },
        { status: 500 }
      );
    }

    const healthData = {
      ok: true,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      database: 'connected',
      supabase: {
        url: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'configured' : 'missing',
        anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'configured' : 'missing',
      },
    };

    return NextResponse.json(healthData);
  } catch (error) {
    return NextResponse.json(
      { 
        ok: false, 
        error: 'Health check failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}