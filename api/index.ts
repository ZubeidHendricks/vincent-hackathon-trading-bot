import { VercelRequest, VercelResponse } from '@vercel/node';
import { app } from '../packages/dca-backend/src/lib/apiServer';

// Add health check route
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Add auth callback route for Vincent
app.get('/auth/callback', (req, res) => {
  res.json({ 
    message: 'Vincent auth callback endpoint', 
    query: req.query,
    timestamp: new Date().toISOString() 
  });
});

// Vercel serverless function handler
export default app;