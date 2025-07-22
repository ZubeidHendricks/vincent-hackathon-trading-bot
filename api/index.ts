import { VercelRequest, VercelResponse } from '@vercel/node';

// Vercel serverless function handler
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

  const { url, method } = req;
  
  // Health check endpoint
  if (url === '/health' || url === '/api/health') {
    return res.status(200).json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      method,
      url 
    });
  }

  // Vincent auth callback endpoint
  if (url === '/auth/callback' || url === '/api/auth/callback') {
    return res.status(200).json({ 
      message: 'Vincent auth callback endpoint', 
      query: req.query,
      timestamp: new Date().toISOString(),
      method,
      url
    });
  }

  // Default response for all other routes
  return res.status(200).json({ 
    message: 'Vincent Hackathon Trading Bot API',
    timestamp: new Date().toISOString(),
    availableEndpoints: [
      '/health',
      '/auth/callback'
    ]
  });
}