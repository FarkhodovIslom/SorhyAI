import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Parse log file into structured data
 */
function parseLogs() {
  const logPath = path.join(__dirname, '../../../logs', 'sorhy-log.txt');
  
  if (!fs.existsSync(logPath)) {
    return { logs: [], stats: { total: 0, today: 0 } };
  }
  
  try {
    const content = fs.readFileSync(logPath, 'utf8');
    const entries = content.split('='.repeat(80)).filter(entry => entry.trim());
    
    const logs = entries.map(entry => {
      const lines = entry.trim().split('\n');
      if (lines.length < 3) return null;
      
      const firstLine = lines[0];
      const userLine = lines[1];
      const botLine = lines[2];
      
      const timeMatch = firstLine.match(/^(.+?) \|/);
      const userMatch = userLine.match(/^(.+?) \[(.+?)\]: (.+)$/);
      const botMatch = botLine.match(/^Sorhy \[(.+?)\] âž¤ (.+)$/);
      
      if (!timeMatch || !userMatch || !botMatch) return null;
      
      return {
        time: timeMatch[1],
        user: `${userMatch[1]} [${userMatch[2]}]`,
        userMessage: userMatch[3],
        botMessage: botMatch[2],
        model: botMatch[1]
      };
    }).filter(Boolean);
    
    const today = new Date().toDateString();
    const todayCount = logs.filter(log => 
      log.time && new Date(log.time).toDateString() === today
    ).length;
    
    return {
      logs: logs.reverse(), // Newest first
      stats: {
        total: logs.length,
        today: todayCount,
        activeUsers: new Set(logs.map(l => l.user)).size
      }
    };
  } catch (error) {
    console.error(chalk.red('Error parsing logs:'), error);
    return { logs: [], stats: { total: 0, today: 0 } };
  }
}

/**
 * Admin routes factory
 * @param {UserDataManager} userManager - User data manager instance
 * @returns {express.Router} Express router with admin routes
 */
export function adminRoutes(userManager) {
  const router = express.Router();
  
  // Authentication middleware
  const requireAuth = (req, res, next) => {
    const key = req.query.key || req.headers['x-access-key'];
    if (key !== process.env.DEV_ACCESS_KEY) {
      return res.status(401).json({ error: 'Access denied! You are not Hanzo!' });
    }
    next();
  };
  
  // === LOG ROUTES ===
  
  // Download logs
  router.get('/logs/', requireAuth, (req, res) => {
    const logPath = path.join(__dirname, '../../../logs', 'sorhy-log.txt');
    
    if (fs.existsSync(logPath)) {
      res.download(logPath, 'sorhy-log.txt');
    } else {
      res.status(404).send('Log file not found.');
    }
  });
  
  // View logs page
  router.get('/logs/view', requireAuth, (req, res) => {
    res.render('index', { accessKey: process.env.DEV_ACCESS_KEY });
  });
  
  // Logs JSON API
  router.get('/logs/json', requireAuth, (req, res) => {
    const data = parseLogs();
    res.json(data);
  });
  
  // Clear logs
  router.post('/logs/clear', requireAuth, (req, res) => {
    try {
      const logPath = path.join(__dirname, '../../../logs', 'sorhy-log.txt');
      if (fs.existsSync(logPath)) {
        fs.unlinkSync(logPath);
      }
      res.json({ success: true, message: 'Logs cleared successfully' });
    } catch (error) {
      console.error(chalk.red('Error clearing logs:'), error);
      res.status(500).json({ error: 'Failed to clear logs' });
    }
  });
  
  // === STATS ROUTES ===
  
  // Bot statistics
  router.get('/stats/', requireAuth, async (req, res) => {
    try {
      const stats = await userManager.getStats();
      const memoryUsage = process.memoryUsage();
      
      const fullStats = {
        database: stats,
        system: {
          memoryUsage: {
            heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + 'MB',
            heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + 'MB',
            external: Math.round(memoryUsage.external / 1024 / 1024) + 'MB'
          },
          uptime: Math.floor(process.uptime()) + ' seconds',
          rateLimit: { timeFrame: '10 seconds', limit: '1 message' }
        }
      };
      
      res.json(fullStats);
    } catch (error) {
      console.error(chalk.red('Stats error:'), error);
      res.status(500).json({ error: 'Statistics unavailable' });
    }
  });
  
  // === USER ROUTES ===
  
  // Users view page
  router.get('/users/view', requireAuth, (req, res) => {
    res.render('users', { accessKey: process.env.DEV_ACCESS_KEY });
  });
  
  // Users data API with pagination and search
  router.get('/users/data', requireAuth, async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 25;
      const search = req.query.search || '';
      const sortBy = req.query.sortBy || 'lastActivity';
      const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
      
      const skip = (page - 1) * limit;
      const stats = await userManager.getStats();
      
      let users = [];
      let totalCount = 0;
      let totalMessages = 0;
      let totalErrors = 0;
      
      // Build MongoDB query
      let dbQuery = {};
      if (search) {
        dbQuery = {
          $or: [
            { chatId: { $regex: search, $options: 'i' } },
            { model: { $regex: search, $options: 'i' } },
            { language: { $regex: search, $options: 'i' } }
          ]
        };
      }
      
      // Try MongoDB first if connected
      if (userManager.isConnected) {
        try {
          totalCount = await userManager.collection.countDocuments(dbQuery);
          
          const sortObj = {};
          sortObj[sortBy] = sortOrder;
          
          const dbUsers = await userManager.collection
            .find(dbQuery)
            .sort(sortObj)
            .skip(skip)
            .limit(limit)
            .toArray();
          
          for (const userData of dbUsers) {
            const messages = [];
            
            for (let i = 0; i < (userData.history || []).length; i += 2) {
              const userMsg = userData.history[i];
              const assistantMsg = userData.history[i + 1];
              
              if (userMsg && userMsg.role === 'user') {
                messages.push({
                  timestamp: userMsg.timestamp || userData.updatedAt,
                  userMessage: userMsg.content,
                  assistantMessage: assistantMsg && assistantMsg.role === 'assistant' ? assistantMsg.content : 'No response',
                  error: null
                });
                totalMessages++;
              }
            }
            
            users.push({
              id: userData.chatId,
              username: `User_${userData.chatId}`,
              lastActivity: userData.lastActivity,
              createdAt: userData.createdAt,
              model: userData.model,
              language: userData.language,
              messages: messages
            });
          }
        } catch (dbError) {
          console.error(chalk.red('MongoDB query error:'), dbError);
        }
      }
      
      // Fallback to cache if MongoDB failed or no results
      if (users.length === 0) {
        const cacheUsers = Array.from(userManager.cache.entries());
        
        // Filter cache users
        let filteredCache = cacheUsers;
        if (search) {
          const searchLower = search.toLowerCase();
          filteredCache = cacheUsers.filter(([chatId, user]) => 
            chatId.toString().includes(searchLower) ||
            (user.model && user.model.toLowerCase().includes(searchLower)) ||
            (user.language && user.language.toLowerCase().includes(searchLower))
          );
        }
        
        totalCount = filteredCache.length;
        
        // Sort cache users
        filteredCache.sort((a, b) => {
          const [, userA] = a;
          const [, userB] = b;
          const valueA = userA[sortBy] || 0;
          const valueB = userB[sortBy] || 0;
          return sortOrder === 1 ? valueA - valueB : valueB - valueA;
        });
        
        // Paginate cache results
        const paginatedCache = filteredCache.slice(skip, skip + limit);
        
        for (const [chatId, user] of paginatedCache) {
          const messages = [];
          
          for (let i = 0; i < user.history.length; i += 2) {
            const userMsg = user.history[i];
            const assistantMsg = user.history[i + 1];
            
            if (userMsg && userMsg.role === 'user') {
              messages.push({
                timestamp: userMsg.timestamp || Date.now(),
                userMessage: userMsg.content,
                assistantMessage: assistantMsg && assistantMsg.role === 'assistant' ? assistantMsg.content : 'No response',
                error: null
              });
              totalMessages++;
            }
          }
          
          users.push({
            id: chatId,
            username: `User_${chatId}`,
            lastActivity: user.lastActivity,
            createdAt: user.createdAt,
            model: user.model,
            language: user.language,
            messages: messages
          });
        }
      }
      
      const totalPages = Math.ceil(totalCount / limit);
      
      res.json({
        users,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount,
          limit,
          hasNext: page < totalPages,
          hasPrev: page > 1
        },
        stats: {
          totalUsers: stats.totalUsers || totalCount,
          totalMessages,
          totalErrors,
          cachedUsers: stats.cachedUsers,
          queuedSaves: stats.queuedSaves,
          isConnected: stats.isConnected,
          isSaving: stats.isSaving
        },
        query: {
          search,
          sortBy,
          sortOrder: sortOrder === 1 ? 'asc' : 'desc',
          limit
        }
      });
      
    } catch (error) {
      console.error(chalk.red('Error in /admin/users/data:'), error);
      res.status(500).json({ 
        error: 'Failed to load user data',
        details: error.message 
      });
    }
  });
  
  // Export users data
  router.get('/users/export', requireAuth, async (req, res) => {
    try {
      const stats = await userManager.getStats();
      const allUsers = [];
      
      // Export from MongoDB if connected
      if (userManager.isConnected) {
        const dbUsers = await userManager.collection.find({}).toArray();
        allUsers.push(...dbUsers);
      } else {
        // Otherwise from cache
        for (const [chatId, user] of userManager.cache) {
          allUsers.push(user.toMongoDB());
        }
      }
      
      const exportData = {
        exportDate: new Date().toISOString(),
        botName: 'Sorhy Bot',
        version: '2.0',
        stats,
        users: allUsers
      };
      
      const filename = `sorhy-users-${new Date().toISOString().split('T')[0]}.json`;
      
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
      res.json(exportData);
      
      console.log(chalk.blue(`📤 Users exported: ${allUsers.length} records`));
      
    } catch (error) {
      console.error(chalk.red('User export error:'), error);
      res.status(500).json({ error: 'Failed to export data' });
    }
  });
  
  // Clear all users data
  router.post('/users/clear', requireAuth, async (req, res) => {
    try {
      const beforeStats = await userManager.getStats();
      
      // Clear cache
      userManager.cache.clear();
      userManager.saveQueue.clear();
      
      // Clear MongoDB if connected
      if (userManager.isConnected) {
        const result = await userManager.collection.deleteMany({});
        console.log(chalk.yellow(`🗑️ Deleted ${result.deletedCount} users from MongoDB`));
      }
      
      console.log(chalk.red(`🗑️ All user data cleared! (was ${beforeStats.totalUsers} users)`));
      
      res.json({ 
        success: true, 
        message: 'All user data successfully deleted',
        deletedUsers: beforeStats.totalUsers
      });
      
    } catch (error) {
      console.error(chalk.red('User data cleanup error:'), error);
      res.status(500).json({ error: 'Failed to clear data' });
    }
  });
  
  // Get specific user
  router.get('/users/:chatId', requireAuth, async (req, res) => {
    try {
      const { chatId } = req.params;
      const user = await userManager.getUser(chatId);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      res.json({
        user: {
          chatId: user.chatId,
          model: user.model,
          language: user.language,
          lastActivity: user.lastActivity,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          historyLength: user.history.length,
          history: user.history.slice(-10) // Last 10 messages for preview
        }
      });
      
    } catch (error) {
      console.error(chalk.red(`Error getting user ${req.params.chatId}:`), error);
      res.status(500).json({ error: 'Failed to get user data' });
    }
  });
  
  return router;
}