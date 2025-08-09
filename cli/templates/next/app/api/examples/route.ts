import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';

export async function GET() {
  try {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('examples')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch examples', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data || []);
  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { label } = await request.json();
    
    if (!label || typeof label !== 'string') {
      return NextResponse.json(
        { error: 'Label is required and must be a string' },
        { status: 400 }
      );
    }

    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('examples')
      .insert([{ label }])
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Failed to create example', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}