import { Redis } from '@upstash/redis'

const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null

export async function cacheGet(key: string) {
  if (!redis) return null
  try {
    return await redis.get(key)
  } catch (error) {
    return null
  }
}

export async function cacheSet(key: string, value: any, ttlSeconds: number = 300) {
  if (!redis) return false
  try {
    await redis.set(key, value, { ex: ttlSeconds })
    return true
  } catch (error) {
    return false
  }
}

