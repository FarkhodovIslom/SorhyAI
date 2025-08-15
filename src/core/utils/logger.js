import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Logs user interactions with formatted output
 * @param {Object} params - Logging parameters
 * @param {string} params.first_name - User's first name
 * @param {string} params.username - User's username
 * @param {string} params.userMessage - User's message
 * @param {string} params.reply - Bot's reply
 * @param {boolean} params.isDeveloper - Whether user is developer
 * @param {string} params.modelName - Model name used
 */
export function logMessage({ first_name, username, userMessage, reply, isDeveloper, modelName = 'Unknown' }) {
  const now = new Date();
  const tzOffsetMs = 5 * 60 * 60 * 1000; // UTC+5 timezone
  const localTime = new Date(now.getTime() + tzOffsetMs);
  const time = localTime.toLocaleString('uz-UZ');

  // Console logging with colored output
  const separator = '─'.repeat(44);
  console.log(chalk.red(`┌${separator}`));
  console.log(`${chalk.red('│')} ${chalk.cyan.bold(time)} ${isDeveloper ? chalk.magenta('[DEV]') : ''}`);
  console.log(`${chalk.red('│')} ${chalk.green(`${first_name} [${username || 'unknown'}]:`)} ${chalk.white(userMessage.slice(0, 100))}${userMessage.length > 100 ? '...' : ''}`);
  console.log(`${chalk.red('│')} ${chalk.yellow(`Sorhy [${modelName}] ➤`)} ${chalk.white(reply)}`);
  console.log(chalk.red(`└${separator}\n`));
  
  // File logging for non-developers only
  if (!isDeveloper) {
    const logEntry = `\n${'─'.repeat(50)}\n${time} | ${first_name} [${username || 'unknown'}]: ${userMessage}\nSorhy [${modelName}] ➤ ${reply}\n${'─'.repeat(50)}\n`;
    
    const logsDir = path.join(__dirname, '../../../logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    
    const logFile = path.join(logsDir, 'sorhy-log.txt');
    fs.appendFile(logFile, logEntry, (err) => {
      if (err) console.error(chalk.red('Logging error:'), err);
    });
  }
}

/**
 * Logs system events
 * @param {string} level - Log level (info, warn, error)
 * @param {string} message - Log message
 * @param {Object} [data] - Additional data to log
 */
export function logSystem(level, message, data = null) {
  const timestamp = new Date().toISOString();
  const colors = {
    info: chalk.blue,
    warn: chalk.yellow,
    error: chalk.red
  };
  
  const color = colors[level] || chalk.white;
  console.log(color(`[${timestamp}] [${level.toUpperCase()}] ${message}`));
  
  if (data) {
    console.log(color(JSON.stringify(data, null, 2)));
  }
}

/**
 * Logs database operations
 * @param {string} operation - Database operation
 * @param {string} collection - Collection name
 * @param {Object} [details] - Operation details
 */
export function logDatabase(operation, collection, details = null) {
  const timestamp = new Date().toISOString();
  console.log(chalk.cyan(`[${timestamp}] [DB] ${operation} on ${collection}`));
  
  if (details) {
    console.log(chalk.cyan(`Details: ${JSON.stringify(details)}`));
  }
}

/**
 * Creates a performance logger
 * @param {string} operation - Operation name
 * @returns {Function} - End logging function
 */
export function createPerformanceLogger(operation) {
  const startTime = Date.now();
  console.log(chalk.magenta(`⏱️ Starting: ${operation}`));
  
  return (result = null) => {
    const duration = Date.now() - startTime;
    const color = duration > 1000 ? chalk.red : duration > 500 ? chalk.yellow : chalk.green;
    console.log(color(`⏱️ Completed: ${operation} (${duration}ms)`));
    
    if (result) {
      console.log(chalk.magenta(`Result: ${JSON.stringify(result)}`));
    }
  };
}