import { Redis } from "@upstash/redis";
import type { CachedToken } from "./types";

const CACHE_KEY = "rada_api_token_cache";
const TOKEN_API_URL = "https://data.rada.gov.ua/api/token";

const redis = Redis.fromEnv();

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchNewToken(): Promise<CachedToken> {
  console.log("Fetching a new token from Rada API...");
  const MAX_RETRIES = 3;
  const RETRY_DELAY_MS = 500;

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`Fetching new token, attempt ${attempt}/${MAX_RETRIES}...`);

      const headers = {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
      };

      const response = await fetch(TOKEN_API_URL, { headers });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Failed to fetch Rada API token (Status: ${response.status}): ${errorText}`
        );
      }

      const data: { expire: number; token: string } = await response.json();
      const safetyBuffer = 60 * 1000;
      const expiresAt = Date.now() + data.expire * 1000 - safetyBuffer;
      const newCachedToken: CachedToken = { token: data.token, expiresAt };

      const isRedisConfigured =
        process.env.UPSTASH_REDIS_REST_URL &&
        process.env.UPSTASH_REDIS_REST_TOKEN;

      if (isRedisConfigured) {
        await redis.set(CACHE_KEY, newCachedToken);
        console.log("Successfully fetched and cached a new token.");
      } else {
        console.warn(
          "Redis environment variables are not set. Skipping caching."
        );
      }

      return newCachedToken;
    } catch (error) {
      lastError = error as Error;
      if (error instanceof Error) {
        console.warn(`Attempt ${attempt} failed: ${error.message}`);
      }
      if (attempt < MAX_RETRIES) {
        console.log(`Retrying in ${RETRY_DELAY_MS}ms...`);
        await delay(RETRY_DELAY_MS);
      }
    }
  }

  console.error("All attempts to fetch a new token failed.");
  throw lastError;
}

export async function getValidToken(): Promise<string> {
  const cachedData = await redis.get<CachedToken>(CACHE_KEY);

  if (cachedData && cachedData.expiresAt > Date.now()) {
    console.log("Using cached token from Upstash.");
    return cachedData.token;
  }

  const newCachedToken = await fetchNewToken();
  return newCachedToken.token;
}
