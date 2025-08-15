import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import { PORT } from '../bot/config/config.js';
import { adminRoutes } from './routes/admin.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Initialize and configure Express server
 * @param {UserDataManager} userManager - User data manager instance
 * @returns {Object} Express app instance
 */
export function createServer(userManager) {
  const app = express();
  
  // View engine setup
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));
  
  // Static files
  app.use(express.static(path.join(__dirname, 'public')));
  app.use(express.json());
  
  // Health check
  app.get('/ping', (req, res) => res.send('pong'));
  
  // Admin routes
  app.use('/admin', adminRoutes(userManager));
  
  return app;
}

/**
 * Start the Express server
 * @param {Object} app - Express app instance
 * @returns {Promise<void>}
 */
export function startServer(app) {
  return new Promise((resolve, reject) => {
    const server = app.listen(PORT, (err) => {
      if (err) {
        console.error(chalk.red('❌ Server startup error:'), err);
        reject(err);
        return;
      }
      
      console.log(chalk.green(`⚡ Server running on port ${PORT}`));
      console.log(chalk.cyan(`📊 Admin panel: /admin/logs/view?key=${process.env.DEV_ACCESS_KEY}`));
      resolve(server);
    });
    
    // Graceful shutdown
    const gracefulShutdown = () => {
      console.log(chalk.yellow('\n🛑 Shutting down server...'));
      server.close(() => {
        console.log(chalk.green('✅ Server closed'));
      });
    };
    
    process.on('SIGINT', gracefulShutdown);
    process.on('SIGTERM', gracefulShutdown);
  });
}