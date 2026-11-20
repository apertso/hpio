import { useLanguage } from "../context/LanguageContext";
import React, { useState, useEffect } from "react";
import { cryptoApi, CryptoAsset } from "../api/cryptoApi";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import useDebounce from "../hooks/useDebounce";
import logger from "../utils/logger";

interface CryptoSelectorProps {
  onSelect: (asset: CryptoAsset) => void;
}

const CryptoSelector: React.FC<CryptoSelectorProps> = ({ onSelect }) => {
  const { t } = useLanguage();
  const [query, setQuery] = useState("");
  const [assets, setAssets] = useState<CryptoAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const debouncedQuery = useDebounce(query, 500);

  useEffect(() => {
    const fetchAssets = async () => {
      setLoading(true);
      try {
        if (debouncedQuery) {
          const results = await cryptoApi.searchAssets(debouncedQuery);
          setAssets(results);
        } else {
          const top = await cryptoApi.getTopAssets();
          setAssets(top);
        }
      } catch (e) {
        logger.error("Failed to fetch crypto assets", e);
      } finally {
        setLoading(false);
      }
    };
    fetchAssets();
  }, [debouncedQuery]);

  return (
    <div className="space-y-2">
      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-gray-400" />
        <input
          type="text"
          placeholder={t("Поиск криптовалюты...")}
          className="w-full pl-8 pr-3 h-9 md:h-8 bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 rounded-md text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 shadow-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/25"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <div className="max-h-48 overflow-y-auto space-y-1">
        {loading ? (
          <div className="text-center py-2 text-sm text-gray-500 dark:text-gray-400">
            {t("Загрузка...")}
          </div>
        ) : assets.length > 0 ? (
          assets.map((asset) => (
            <div
              key={asset.id}
              onClick={() => onSelect(asset)}
              className="flex items-center gap-2.5 px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-white/[0.06] rounded-md cursor-pointer transition-colors"
            >
              <img
                src={asset.image || asset.large}
                alt={asset.name}
                className="size-5 rounded-full"
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {asset.name}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {asset.symbol.toUpperCase()}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-2 text-sm text-gray-500 dark:text-gray-400">
            {t("Ничего не найдено")}
          </div>
        )}
      </div>
    </div>
  );
};

export default CryptoSelector;
