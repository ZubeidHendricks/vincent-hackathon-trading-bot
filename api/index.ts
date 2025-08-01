import { VercelRequest, VercelResponse } from '@vercel/node';

// Vercel serverless function handler - Default API endpoint
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Default API response
  return res.status(200).json({ 
    message: 'Vincent Hackathon Trading Bot API',
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    availableEndpoints: [
      '/api/health - Health check endpoint',
      '/api/auth/callback - Vincent authentication callback'
    ],
    deploymentId: process.env.VERCEL_DEPLOYMENT_ID || 'local',
    region: process.env.VERCEL_REGION || 'unknown'
  });
}