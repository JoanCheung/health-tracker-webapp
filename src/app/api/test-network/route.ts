import { NextRequest, NextResponse } from 'next/server';
import { createConnection } from 'net';

export async function GET(request: NextRequest) {
  console.log('=== Network Connectivity Test ===');
  
  const host = process.env.DB_HOST;
  const port = parseInt(process.env.DB_PORT || '3306');
  
  console.log(`Testing network connection to ${host}:${port}`);

  return new Promise((resolve) => {
    const startTime = Date.now();
    const socket = createConnection({ host, port });
    
    socket.setTimeout(10000); // 10 second timeout
    
    socket.on('connect', () => {
      const duration = Date.now() - startTime;
      console.log(`✅ Network connection successful in ${duration}ms`);
      socket.end();
      
      resolve(NextResponse.json({
        success: true,
        message: 'Network connection successful',
        host,
        port,
        duration: `${duration}ms`
      }));
    });
    
    socket.on('error', (error) => {
      const duration = Date.now() - startTime;
      console.log(`❌ Network connection failed after ${duration}ms:`, error.message);
      socket.destroy();
      
      resolve(NextResponse.json({
        success: false,
        message: 'Network connection failed',
        error: error.message,
        host,
        port,
        duration: `${duration}ms`
      }, { status: 500 }));
    });
    
    socket.on('timeout', () => {
      const duration = Date.now() - startTime;
      console.log(`❌ Network connection timeout after ${duration}ms`);
      socket.destroy();
      
      resolve(NextResponse.json({
        success: false,
        message: 'Network connection timeout',
        host,
        port,
        duration: `${duration}ms`
      }, { status: 500 }));
    });
  });
}