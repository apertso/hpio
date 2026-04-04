import React, { useState, useEffect } from "react";
import { cryptoApi, CryptoAsset } from "../api/cryptoApi";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import useDebounce from "../hooks/useDebounce";
import logger from "../utils/logger";

interface CryptoSelectorProps {
  onSelect: (asset: CryptoAsset) => void;
}

const CryptoSelector: React.FC<CryptoSelectorProps> = ({ onSelect }) => {
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
        <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Поиск криптовалюты..."
          className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-base text-gray-900 dark:text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <div className="max-h-48 overflow-y-auto space-y-1">
        {loading ? (
          <div className="text-center py-2 text-sm text-gray-500 dark:text-gray-400">
            Загрузка...
          </div>
        ) : assets.length > 0 ? (
          assets.map((asset) => (
            <div
              key={asset.id}
              onClick={() => onSelect(asset)}
              className="flex items-center gap-3 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl cursor-pointer transition-colors"
            >
              <img
                src={asset.image || asset.large}
                alt={asset.name}
                className="w-6 h-6 rounded-full"
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
            Ничего не найдено
          </div>
        )}
      </div>
    </div>
  );
};

export default CryptoSelector;
