import { Redis } from "@upstash/redis";

const CACHE_KEY = "rada_api_token_cache";
const TOKEN_API_URL = "https://data.rada.gov.ua/api/token";

const redis = Redis.fromEnv();

interface CachedToken {
  token: string;
  expiresAt: number;
}

async function fetchNewToken(): Promise<CachedToken> {
  console.log("Fetching a new token from Rada API...");

  const ipAddress = process.env.RADA_REGISTERED_IP;
  if (!ipAddress) {
    throw new Error("RADA_REGISTERED_IP is not set in environment variables.");
  }
  const headers = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  };

  const response = await fetch(`${TOKEN_API_URL}`, { headers });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to fetch Rada API token: ${response.status} ${errorText}`
    );
  }

  const data: { expire: number; token: string } = await response.json();

  const safetyBuffer = 60 * 1000;
  const expiresAt = Date.now() + data.expire * 1000 - safetyBuffer;

  const newCachedToken: CachedToken = {
    token: data.token,
    expiresAt,
  };

  await redis.set(CACHE_KEY, newCachedToken);
  console.log("Successfully fetched and cached a new token.");

  return newCachedToken;
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
