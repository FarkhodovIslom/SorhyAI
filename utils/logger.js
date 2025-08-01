// utils/logger.js
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';

export class Logger {
    constructor() {
        this.logsDir = 'logs';
        this.logFile = path.join(this.logsDir, 'sorhy-log.txt');
        this.ensureLogsDirectory();
    }

    ensureLogsDirectory() {
        if (!fs.existsSync(this.logsDir)) {
            fs.mkdirSync(this.logsDir, { recursive: true });
        }
    }

    getCurrentTimestamp() {
        const now = new Date();
        const uzbekTime = new Date(now.getTime() + 5 * 60 * 60 * 1000); 
        return uzbekTime.toLocaleString('uz-UZ');
    }

    escapeMarkdown(text) {
        const hasSpecialChars = /[*_`\[\]()~>#+\-=|{}\.!\\]/g.test(text);
        if (!hasSpecialChars) return text;
        
        return text
            .replace(/\\/g, '\\\\')
            .replace(/\[/g, '\\[')
            .replace(/\]/g, '\\]')
            .replace(/\(/g, '\\(')
            .replace(/\)/g, '\\)')
            .replace(/_/g, '\\_')
            .replace(/~/g, '\\~');
    }

    truncateText(text, maxLength = 100) {
        if (text.length <= maxLength) return text;
        return text.slice(0, maxLength) + '...';
    }

    logMessage({ firstName, username, userMessage, botReply, isDeveloper = false, modelName = 'Unknown' }) {
        const timestamp = this.getCurrentTimestamp();
        
        // Консольный вывод с красивым форматированием
        console.log(chalk.red('┌────────────────────────────────────────────'));
        console.log(`${chalk.red('│')} ${chalk.cyan.bold(timestamp)} ${isDeveloper ? chalk.magenta('[DEV]') : ''}`);
        console.log(`${chalk.red('│')} ${chalk.green(`${firstName} [${username || 'unknown'}]:`)} ${chalk.white(this.truncateText(userMessage))}`);
        console.log(`${chalk.red('│')} ${chalk.yellow(`Sorhy [${modelName}] ➤`)} ${chalk.white(this.truncateText(botReply))}`);
        console.log(chalk.red('└────────────────────────────────────────────\n'));

        // Запись в файл (только для обычных пользователей)
        if (!isDeveloper) {
            this.writeToFile(timestamp, firstName, username, userMessage, botReply, modelName);
        }
    }

    writeToFile(timestamp, firstName, username, userMessage, botReply, modelName) {
        const logEntry = `
${'='.repeat(80)}
${timestamp} | 
${firstName} [${username || 'unknown'}]: ${userMessage}

Sorhy [${modelName}] ➤ ${botReply}
${'='.repeat(80)}
`;

        fs.appendFile(this.logFile, logEntry, (error) => {
            if (error) {
                console.error(chalk.red('❌ Ошибка записи лога:'), error);
            }
        });
    }

    logError(message, error = null) {
        const timestamp = this.getCurrentTimestamp();
        console.error(chalk.red(`❌ [${timestamp}] ${message}`));
        if (error) {
            console.error(chalk.red('Stack trace:'), error);
        }
    }

    logInfo(message) {
        const timestamp = this.getCurrentTimestamp();
        console.log(chalk.blue(`ℹ️  [${timestamp}] ${message}`));
    }

    logSuccess(message) {
        const timestamp = this.getCurrentTimestamp();
        console.log(chalk.green(`✅ [${timestamp}] ${message}`));
    }

    logWarning(message) {
        const timestamp = this.getCurrentTimestamp();
        console.log(chalk.yellow(`⚠️  [${timestamp}] ${message}`));
    }

    logCooldown(firstName, username, remainingTime) {
        console.log(chalk.yellow(`⏰ Пользователь ${firstName} [${username}] заблокирован на ${remainingTime}с`));
    }

    logDeveloperAccess(firstName, username, action = 'command') {
        const timestamp = this.getCurrentTimestamp();
        console.log(chalk.magenta(`👑 [${timestamp}] Developer ${firstName} [${username}] выполнил ${action}`));
    }

    // Метод для очистки старых логов
    async clearOldLogs(daysToKeep = 30) {
        try {
            const stats = fs.statSync(this.logFile);
            const fileAge = Date.now() - stats.mtime.getTime();
            const daysInMs = daysToKeep * 24 * 60 * 60 * 1000;

            if (fileAge > daysInMs) {
                const archiveFile = path.join(this.logsDir, `sorhy-log-${Date.now()}.txt`);
                fs.renameSync(this.logFile, archiveFile);
                this.logInfo(`Старый лог файл архивирован: ${archiveFile}`);
            }
        } catch (error) {
            this.logError('Ошибка при архивации логов', error);
        }
    }
}