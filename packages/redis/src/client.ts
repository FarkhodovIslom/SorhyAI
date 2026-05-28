import Redis from 'ioredis';

let client: Redis | null = null;

export function getRedis(url: string): Redis {
    if (client) {
        return client;
    }
    client = new Redis(url, {
        maxRetriesPerRequest: 3,
        lazyConnect: true,
    });

    client.on('connect', () =>  console.log('Redis client connected'));
    client.on('error', (err) => console.error('Redis client error:', err));

    return client;

}

export function getRedisClient(): Redis {
    if (!client) {
        throw new Error('Redis client not initialized. Call getRedis(url) first.');
    }
    return client;
}