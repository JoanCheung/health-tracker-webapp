import { put } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!file.name || file.size === 0) {
      return NextResponse.json({ error: 'Invalid file' }, { status: 400 });
    }

    // Generate unique filename to avoid conflicts
    const timestamp = Date.now();
    const filename = `health-tracker-${timestamp}-${file.name}`;
    
    const blob = await put(filename, file, {
      access: 'public',
    });

    return NextResponse.json({ url: blob.url });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ 
      error: 'Failed to upload file. Please try again.' 
    }, { status: 500 });
  }
}