import type Redis from "ioredis";

export function createRedisStorage(redis: Redis) {
  return {
    async read<T>(key: string): Promise<T | undefined> {
      const data = await redis.get(`session:${key}`);
      return data ? (JSON.parse(data) as T) : undefined;
    },
    async write<T>(key: string, value: T) {
      await redis.set(
        `session:${key}`,
        JSON.stringify(value),
        "EX",
        60 * 60 * 24 * 7,
      );
    },
    async delete(key: string) {
      await redis.del(`session:${key}`);
    },
  };
}
