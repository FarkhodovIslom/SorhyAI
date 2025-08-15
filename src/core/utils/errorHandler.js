import chalk from 'chalk';
import { logSystem } from './logger.js';

/**
 * Custom error classes for better error handling
 */
export class BotError extends Error {
  constructor(message, code = 'BOT_ERROR', statusCode = 500) {
    super(message);
    this.name = 'BotError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

export class DatabaseError extends Error {
  constructor(message, operation = 'unknown') {
    super(message);
    this.name = 'DatabaseError';
    this.operation = operation;
  }
}

export class RateLimitError extends Error {
  constructor(message = 'Rate limit exceeded') {
    super(message);
    this.name = 'RateLimitError';
  }
}

export class ValidationError extends Error {
  constructor(message, field = null) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
  }
}

/**
 * Enhanced error handler for different types of errors
 * @param {Error} error - The error to handle
 * @param {Object} [context] - Additional context information
 * @param {Function} [callback] - Optional callback for custom handling
 */
export function handleError(error, context = {}, callback = null) {
  const errorInfo = {
    name: error.name || 'Unknown',
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
    context
  };

  // Log based on error type
  switch (error.constructor) {
    case DatabaseError:
      logSystem('error', `Database error in ${error.operation}: ${error.message}`, { context });
      break;
      
    case RateLimitError:
      logSystem('warn', `Rate limit: ${error.message}`, { context });
      break;
      
    case ValidationError:
      logSystem('warn', `Validation error${error.field ? ` in ${error.field}` : ''}: ${error.message}`, { context });
      break;
      
    case BotError:
      logSystem('error', `Bot error [${error.code}]: ${error.message}`, { context });
      break;
      
    default:
      logSystem('error', `Unexpected error: ${error.message}`, errorInfo);
      break;
  }

  // Execute custom callback if provided
  if (callback && typeof callback === 'function') {
    try {
      callback(error, errorInfo);
    } catch (callbackError) {
      logSystem('error', 'Error in error handler callback', { 
        originalError: error.message,
        callbackError: callbackError.message 
      });
    }
  }

  return errorInfo;
}

/**
 * Wraps async functions with error handling
 * @param {Function} asyncFn - Async function to wrap
 * @param {Object} [context] - Context for error logging
 * @returns {Function} - Wrapped function
 */
export function withErrorHandling(asyncFn, context = {}) {
  return async (...args) => {
    try {
      return await asyncFn(...args);
    } catch (error) {
      handleError(error, { ...context, args });
      throw error; // Re-throw after logging
    }
  };
}

/**
 * Creates a safe async function that won't throw
 * @param {Function} asyncFn - Async function to make safe
 * @param {*} [defaultValue] - Default value to return on error
 * @param {Object} [context] - Context for error logging
 * @returns {Function} - Safe function
 */
export function createSafeAsync(asyncFn, defaultValue = null, context = {}) {
  return async (...args) => {
    try {
      return await asyncFn(...args);
    } catch (error) {
      handleError(error, { ...context, args });
      return defaultValue;
    }
  };
}

/**
 * Retry mechanism for functions that might fail
 * @param {Function} fn - Function to retry
 * @param {number} [maxRetries=3] - Maximum retry attempts
 * @param {number} [delay=1000] - Delay between retries in ms
 * @param {Object} [context] - Context for error logging
 * @returns {Function} - Function with retry logic
 */
export function withRetry(fn, maxRetries = 3, delay = 1000, context = {}) {
  return async (...args) => {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn(...args);
      } catch (error) {
        lastError = error;
        
        if (attempt === maxRetries) {
          handleError(error, { 
            ...context, 
            attempts: maxRetries,
            finalAttempt: true
          });
          throw error;
        }
        
        logSystem('warn', `Attempt ${attempt}/${maxRetries} failed: ${error.message}. Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError;
  };
}

/**
 * Global error handlers for uncaught exceptions
 */
export function setupGlobalErrorHandlers() {
  process.on('uncaughtException', (error) => {
    console.error(chalk.red('❌ Uncaught Exception:'));
    handleError(error, { type: 'uncaughtException' });
    
    // Give the system time to log before exiting
    setTimeout(() => {
      process.exit(1);
    }, 1000);
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error(chalk.red('❌ Unhandled Rejection:'));
    const error = reason instanceof Error ? reason : new Error(String(reason));
    handleError(error, { 
      type: 'unhandledRejection',
      promise: promise.toString()
    });
  });
}

/**
 * Telegram-specific error handler
 * @param {Object} ctx - Grammy context
 * @param {Error} error - The error that occurred
 */
export async function handleTelegramError(ctx, error) {
  const context = {
    updateId: ctx.update?.update_id,
    chatId: ctx.chat?.id,
    userId: ctx.from?.id,
    messageText: ctx.message?.text?.slice(0, 100)
  };

  handleError(error, context);

  // Try to send user-friendly error message
  try {
    if (ctx.chat && !ctx.callbackQuery) {
      await ctx.reply('😔 Something went wrong. Please try again later.');
    }
  } catch (replyError) {
    logSystem('error', 'Failed to send error message to user', { 
      originalError: error.message,
      replyError: replyError.message
    });
  }
}