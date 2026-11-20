import { useState, useEffect, useCallback, useRef } from "react";
import axiosInstance from "../api/axiosInstance";
import { PHOTO_URL } from "../api/userApi";
import logger from "../utils/logger";

const CACHE_KEY = "user_avatar_cache";
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 часа

interface AvatarCache {
  data: string; // base64
  timestamp: number;
  photoPath: string;
}

interface UseAvatarCacheResult {
  avatarUrl: string | null;
  isLoading: boolean;
  refreshAvatar: () => Promise<void>;
}

/**
 * Читает актуальный аватар из localStorage (data: URL) или возвращает null,
 * если кэша нет, он устарел или относится к другому фото.
 */
function readCachedAvatar(photoPath: string): string | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const cache: AvatarCache = JSON.parse(cached);
    const isExpired = Date.now() - cache.timestamp > CACHE_DURATION;
    if (isExpired || cache.photoPath !== photoPath || !cache.data) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    return cache.data;
  } catch (error) {
    logger.error("Failed to parse cached avatar:", error);
    localStorage.removeItem(CACHE_KEY);
    return null;
  }
}

export function useAvatarCache(
  photoPath: string | null | undefined,
  token: string | null
): UseAvatarCacheResult {
  // Синхронно берём аватар из кэша, чтобы при перезагрузке не мелькали инициалы
  const [avatarUrl, setAvatarUrl] = useState<string | null>(() =>
    photoPath && token ? readCachedAvatar(photoPath) : null
  );
  const [isLoading, setIsLoading] = useState(false);
  const blobUrlRef = useRef<string | null>(null);

  const cleanupBlobUrl = useCallback(() => {
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
  }, []);

  const fetchAndCacheAvatar = useCallback(async () => {
    if (!photoPath || !token) {
      setAvatarUrl(null);
      return;
    }

    setIsLoading(true);
    try {
      const response = await axiosInstance.get(`${PHOTO_URL}?token=${token}`, {
        responseType: "blob",
      });

      const blob = response.data;

      // Создаем blob URL для отображения
      cleanupBlobUrl();
      const url = URL.createObjectURL(blob);
      blobUrlRef.current = url;
      setAvatarUrl(url);

      // Конвертируем в base64 для localStorage
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        const cache: AvatarCache = {
          data: base64,
          timestamp: Date.now(),
          photoPath,
        };
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
          logger.info("Avatar cached successfully");
        } catch (error) {
          logger.warn("Failed to cache avatar in localStorage:", error);
        }
      };
      reader.readAsDataURL(blob);
    } catch (error) {
      logger.error("Failed to fetch avatar:", error);
      setAvatarUrl(null);
    } finally {
      setIsLoading(false);
    }
  }, [photoPath, token, cleanupBlobUrl]);

  const loadFromCache = useCallback((): boolean => {
    if (!photoPath || !token) {
      setAvatarUrl(null);
      return false;
    }

    const cachedData = readCachedAvatar(photoPath);
    if (!cachedData) return false;

    // data: URL отображается напрямую — без асинхронной конвертации в blob
    cleanupBlobUrl();
    setAvatarUrl(cachedData);
    return true;
  }, [photoPath, token, cleanupBlobUrl]);

  const refreshAvatar = useCallback(async () => {
    localStorage.removeItem(CACHE_KEY);
    await fetchAndCacheAvatar();
  }, [fetchAndCacheAvatar]);

  useEffect(() => {
    if (!photoPath || !token) {
      cleanupBlobUrl();
      setAvatarUrl(null);
      return;
    }

    const cacheLoaded = loadFromCache();
    if (!cacheLoaded) {
      fetchAndCacheAvatar();
    }

    return () => {
      cleanupBlobUrl();
    };
  }, [photoPath, token, loadFromCache, fetchAndCacheAvatar, cleanupBlobUrl]);

  // Обновление при переходе в онлайн
  useEffect(() => {
    const handleOnline = () => {
      if (!photoPath || !token) return;

      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const cache: AvatarCache = JSON.parse(cached);
          const now = Date.now();
          const isExpired = now - cache.timestamp > CACHE_DURATION;

          if (isExpired) {
            logger.info("Avatar cache expired, refreshing...");
            refreshAvatar();
          }
        }
      } catch (error) {
        logger.error("Failed to check avatar cache on online:", error);
      }
    };

    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("online", handleOnline);
    };
  }, [photoPath, token, refreshAvatar]);

  return {
    avatarUrl,
    isLoading,
    refreshAvatar,
  };
}
