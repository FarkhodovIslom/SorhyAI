import 'dotenv/config';
import chalk from 'chalk';
import { MONGO_URI } from './bot/config/config.js';
import { UserDataManager } from './core/database/userManager.js';
import { createBot } from './bot/bot.js';
import { createServer, startServer } from './server/server.js';

// Environment validation
const requiredEnvVars = [
  'OPENROUTER_API_KEY',
  'TGBOT_API_KEY2', 
  'DEV_ACCESS_KEY'
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(chalk.red(`❌ Missing environment variable: ${envVar}`));
    process.exit(1);
  }
}

// Initialize services
const userManager = new UserDataManager(
  process.env.MONGODB_URI || MONGO_URI,
  process.env.DB_NAME || 'sorhy'
);

const { bot, initializeBot } = createBot(userManager);

/**
 * Initializes the application
 */
async function initializeApp() {
  console.log(chalk.blue('🚀 Starting Telegram Bot...'));
  
  // Connect to MongoDB
  const mongoConnected = await userManager.connect();
  if (!mongoConnected) {
    console.error(chalk.red('❌ MongoDB connection failed. Bot may be unstable.'));
  }
  
  // Initialize bot
  await initializeBot();
  
  // Create server
  const app = createServer(userManager);
  
  // Start bot and server simultaneously
  await Promise.all([
    bot.start(),
    startServer(app)
  ]);
  
  console.log(chalk.blue(`🛡️ Rate limiting active (1 message / 10 seconds)`));
}

// Graceful shutdown handling
const gracefulShutdown = async () => {
  console.log(chalk.yellow('\n🛑 Shutdown signal received...'));
  
  try {
    await bot.stop();
    console.log(chalk.green('✅ Bot stopped'));
    
    await userManager.disconnect();
    console.log(chalk.green('✅ Database disconnected'));
    
  } catch (error) {
    console.error(chalk.red('❌ Error during shutdown:'), error);
  } finally {
    process.exit(0);
  }
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error(chalk.red('❌ Uncaught Exception:'), error);
  gracefulShutdown();
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(chalk.red('❌ Unhandled Rejection at:'), promise, 'reason:', reason);
});

// Start application
initializeApp().catch(error => {
  console.error(chalk.red('❌ Critical startup error:'), error);
  process.exit(1);
});