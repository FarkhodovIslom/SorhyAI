import Fastify from "fastify";
import type { Bot } from "grammy";
import { BotContext } from "./types.js";

export function createServer(bot: Bot<BotContext>) {
    const fastify = Fastify();

    // Health check
    fastify.get("/health", async () => {
        return { status: "OK", timestamp: new Date().toISOString() };
    });

    // Webhook endpoint 
    fastify.post('/webhook', async (req, reply) => {
        reply.code(200).send({ status: 'ok' });

        bot.handleUpdate(req.body as never).catch(err => {
            console.error('Error handling update:', err);
        });
    });

    return fastify;
}