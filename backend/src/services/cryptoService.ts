import axios from "axios";
import logger from "../config/logger";

// Simple in-memory cache
let coinsCache: any[] = [];
let lastCacheTime = 0;
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

// Price cache - shorter duration since prices change more frequently
let pricesCache: Record<string, any> = {};
let pricesCacheTime: Record<string, number> = {};
const PRICE_CACHE_DURATION = 1000 * 60 * 5; // 5 minutes

export const getTopCoins = async () => {
  // Check cache first
  if (coinsCache.length > 0 && Date.now() - lastCacheTime < CACHE_DURATION) {
    return coinsCache;
  }

  try {
    const response = await axios.get(
      "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=10&page=1"
    );

    // Update cache
    coinsCache = response.data;
    lastCacheTime = Date.now();

    return response.data;
  } catch (error) {
    logger.error("Failed to fetch top coins", error);
    throw new Error("Failed to fetch crypto data");
  }
};

export const searchCoins = async (query: string) => {
  try {
    const response = await axios.get(
      `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(
        query
      )}`
    );
    return response.data;
  } catch (error) {
    logger.error("Failed to search coins", error);
    throw new Error("Failed to search crypto data");
  }
};

export const getPrices = async (ids: string[], currency: string = "usd") => {
  if (ids.length === 0) return {};
  
  // Create cache key based on ids and currency
  const cacheKey = `${ids.sort().join(",")}_${currency.toLowerCase()}`;
  
  // Check if we have valid cached data
  const cachedTime = pricesCacheTime[cacheKey];
  if (cachedTime && Date.now() - cachedTime < PRICE_CACHE_DURATION) {
    logger.info(`Using cached prices for ${ids.length} coins (age: ${Math.round((Date.now() - cachedTime) / 1000)}s)`);
    return pricesCache[cacheKey];
  }
  
  try {
    const idsStr = ids.join(",");
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${idsStr}&vs_currencies=${currency.toLowerCase()}`;
    logger.info(`Fetching crypto prices from API: ${url}`);

    const response = await axios.get(url);

    // Update cache
    pricesCache[cacheKey] = response.data;
    pricesCacheTime[cacheKey] = Date.now();

    // Log success but without spamming too much data
    logger.info(`Crypto prices fetched successfully for ${ids.length} coins`);

    return response.data;
  } catch (error: any) {
    if (axios.isAxiosError(error)) {
      logger.error(`Failed to fetch coin prices: ${error.message}`, {
        status: error.response?.status,
        data: error.response?.data,
        url: error.config?.url
      });
    } else {
      logger.error("Failed to fetch coin prices", error);
    }
    
    // If we have stale cache, return it rather than empty
    if (pricesCache[cacheKey]) {
      logger.info("Returning stale cached prices due to API error");
      return pricesCache[cacheKey];
    }
    
    // Return empty object on error to allow showing balances without current price
    return {};
  }
};
