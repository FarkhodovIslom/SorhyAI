import { env } from "@sorhy/config";
import { connectDB } from "@sorhy/db";
import { getRedis } from "@sorhy/redis";
import { createBot } from "./bot/index.js";
import { createServer } from "./server.js";

async function main() {
  // DB & Redis
  await connectDB(env.MONGODB_URI);
  getRedis(env.REDIS_URL);

  const bot = createBot(env.BOT_TOKEN);
  const server = createServer(bot);

  if (env.NODE_ENV === "production" && env.WEBHOOK_URL) {
    await bot.api.setWebhook(env.WEBHOOK_URL);
    await server.listen({ port: env.PORT, host: "0.0.0.0" });
    console.log(`Bot is running in webhook mode at ${env.WEBHOOK_URL}`);
  } else {
    await server.listen({ port: env.PORT, host: "0.0.0.0" });
    console.log(`Bot is running in long polling mode on port ${env.PORT}`);
    await bot.start();
    console.log("Bot started with long polling");
  }
}

main().catch((err) => {
  console.error("Failed to start bot:", err);
  process.exit(1);
});
