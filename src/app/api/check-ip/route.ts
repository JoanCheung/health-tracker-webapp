import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  console.log('=== IP Address Detection ===');
  
  // Get client IP from various sources
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const clientIp = request.headers.get('x-client-ip');
  
  // Try to get public IP using external service
  let publicIp = null;
  try {
    const response = await fetch('https://api.ipify.org?format=json', { 
      method: 'GET'
    });
    if (response.ok) {
      const data = await response.json();
      publicIp = data.ip;
    }
  } catch (error) {
    console.log('Failed to get public IP:', error);
  }

  // Alternative IP detection
  let altPublicIp = null;
  try {
    const response = await fetch('https://httpbin.org/ip', { 
      method: 'GET'
    });
    if (response.ok) {
      const data = await response.json();
      altPublicIp = data.origin;
    }
  } catch (error) {
    console.log('Failed to get alternative public IP:', error);
  }

  const result = {
    detectedIPs: {
      forwardedFor: forwardedFor || 'Not available',
      realIp: realIp || 'Not available', 
      clientIp: clientIp || 'Not available',
      publicIp: publicIp || 'Could not detect',
      altPublicIp: altPublicIp || 'Could not detect'
    },
    recommendation: {
      message: 'Add these IP addresses to your Alibaba Cloud RDS whitelist:',
      ipsToAdd: [
        publicIp,
        altPublicIp,
        forwardedFor,
        '0.0.0.0/0 (for testing - allows all IPs, not recommended for production)'
      ].filter(ip => ip && ip !== 'Not available' && ip !== 'Could not detect'),
      steps: [
        '1. 登录阿里云控制台',
        '2. 进入RDS管理控制台',
        '3. 选择您的RDS实例',
        '4. 点击左侧菜单"数据安全性"',
        '5. 点击"白名单设置"',
        '6. 点击"修改"按钮',
        '7. 添加上面检测到的IP地址',
        '8. 或临时添加 0.0.0.0/0 进行测试'
      ]
    },
    troubleshooting: {
      commonIssues: [
        '白名单设置：最常见的问题，需要添加您的公网IP',
        '用户权限：app_user需要有远程连接权限',
        '数据库不存在：health_tracker数据库需要先创建',
        '用户名密码错误：请确认凭据完全正确'
      ],
      quickTest: '临时添加 0.0.0.0/0 到白名单，如果连接成功则确认是IP白名单问题'
    }
  };

  console.log('IP Detection Result:', result);

  return NextResponse.json(result);
}