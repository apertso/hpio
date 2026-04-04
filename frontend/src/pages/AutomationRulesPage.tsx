import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowPathIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import PageMeta from "../components/PageMeta";
import { getPageMetadata } from "../utils/pageMetadata";
import { usePageTitle } from "../context/PageTitleContext";
import { useToast } from "../context/ToastContext";
import {
  merchantRuleApi,
  MerchantCategoryRule,
  UnassignedMerchant,
} from "../api/merchantRuleApi";
import useCategories from "../hooks/useCategories";
import Select from "../components/Select";
import Spinner from "../components/Spinner";
import { Button } from "../components/Button";
import { TextInputField } from "../components/Input";
import getErrorMessage from "../utils/getErrorMessage";
import ConfirmModal from "../components/ConfirmModal";

type TreeNode =
  | { type: "rule"; rule: MerchantCategoryRule }
  | { type: "unassigned"; merchant: UnassignedMerchant };

interface TreeGroup {
  id: string;
  label: string;
  nodes: TreeNode[];
  isUncategorized: boolean;
}

const AutomationRulesPage: React.FC = () => {
  const { setPageTitle } = usePageTitle();
  const { showToast } = useToast();
  const metadata = getPageMetadata("automation-rules");
  const { categories, isLoading: isLoadingCategories } = useCategories("expense");

  const [rules, setRules] = useState<MerchantCategoryRule[]>([]);
  const [unassignedMerchants, setUnassignedMerchants] = useState<
    UnassignedMerchant[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [ruleCategoryEdits, setRuleCategoryEdits] = useState<
    Record<string, string>
  >({});
  const [merchantCategoryEdits, setMerchantCategoryEdits] = useState<
    Record<string, string>
  >({});
  const [savingRuleIds, setSavingRuleIds] = useState<Set<string>>(
    new Set()
  );
  const [savingMerchants, setSavingMerchants] = useState<Set<string>>(
    new Set()
  );
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    {}
  );
  const [confirmModalState, setConfirmModalState] = useState<{
    isOpen: boolean;
    action: (() => void) | null;
    title: string;
    message: string;
  }>({ isOpen: false, action: null, title: "", message: "" });
  const [isConfirming, setIsConfirming] = useState(false);

  useEffect(() => {
    setPageTitle("Правила автоматизации");
  }, [setPageTitle]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [rulesData, unassignedData] = await Promise.all([
        merchantRuleApi.getMerchantRules(),
        merchantRuleApi.getUnassignedMerchants(),
      ]);
      setRules(rulesData);
      setUnassignedMerchants(unassignedData);
      setRuleCategoryEdits({});
      setMerchantCategoryEdits({});
    } catch (error) {
      showToast(
        `Не удалось загрузить правила: ${getErrorMessage(error)}`,
        "error"
      );
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const categoryOptions = useMemo(() => {
    return [
      { value: null, label: "Все категории" },
      ...(categories?.map((category) => ({
        value: category.id,
        label: category.name,
      })) || []),
    ];
  }, [categories]);

  const editOptions = useMemo(() => {
    return (
      categories?.map((category) => ({
        value: category.id,
        label: category.name,
      })) || []
    );
  }, [categories]);

  const searchValue = search.trim().toLowerCase();

  const filteredRules = useMemo(() => {
    return rules.filter((rule) => {
      const matchesSearch = searchValue
        ? rule.merchantKeyword.toLowerCase().includes(searchValue)
        : true;
      const matchesCategory = categoryFilter
        ? rule.categoryId === categoryFilter
        : true;
      return matchesSearch && matchesCategory;
    });
  }, [rules, searchValue, categoryFilter]);

  const filteredUnassigned = useMemo(() => {
    if (categoryFilter) {
      return [];
    }
    return unassignedMerchants.filter((merchant) =>
      searchValue
        ? merchant.merchantName.toLowerCase().includes(searchValue)
        : true
    );
  }, [unassignedMerchants, searchValue, categoryFilter]);

  const hasActiveFilters = Boolean(searchValue || categoryFilter);
  const uncategorizedGroupId = "uncategorized";

  const groupedRules = useMemo(() => {
    const grouped = new Map<string, MerchantCategoryRule[]>();
    filteredRules.forEach((rule) => {
      const groupId = rule.categoryId || uncategorizedGroupId;
      const existing = grouped.get(groupId) || [];
      grouped.set(groupId, [...existing, rule]);
    });
    return grouped;
  }, [filteredRules, uncategorizedGroupId]);

  const treeGroups = useMemo((): TreeGroup[] => {
    const groups: TreeGroup[] = [];
    const uncategorizedNodes: TreeNode[] = filteredUnassigned.map(
      (merchant) => ({
        type: "unassigned",
        merchant,
      })
    );
    if (!hasActiveFilters || uncategorizedNodes.length > 0) {
      groups.push({
        id: uncategorizedGroupId,
        label: "Без категории",
        nodes: uncategorizedNodes,
        isUncategorized: true,
      });
    }

    const orderedCategories = categories || [];
    const knownCategoryIds = new Set(orderedCategories.map((category) => category.id));
    orderedCategories.forEach((category) => {
      const nodes: TreeNode[] = (groupedRules.get(category.id) || []).map(
        (rule) => ({
          type: "rule",
          rule,
        })
      );
      if (!hasActiveFilters || nodes.length > 0) {
        groups.push({
          id: category.id,
          label: category.name,
          nodes,
          isUncategorized: false,
        });
      }
    });

    const missingCategoryNodes: TreeNode[] = [];
    groupedRules.forEach((rulesForCategory, categoryId) => {
      if (categoryId === uncategorizedGroupId || knownCategoryIds.has(categoryId)) {
        return;
      }
      rulesForCategory.forEach((rule) => {
        missingCategoryNodes.push({
          type: "rule",
          rule,
        });
      });
    });
    if (!hasActiveFilters || missingCategoryNodes.length > 0) {
      if (missingCategoryNodes.length > 0) {
        groups.push({
          id: "missing-category",
          label: "Категория удалена",
          nodes: missingCategoryNodes,
          isUncategorized: false,
        });
      }
    }

    return groups;
  }, [
    categories,
    filteredUnassigned,
    groupedRules,
    hasActiveFilters,
    uncategorizedGroupId,
  ]);

  useEffect(() => {
    setExpandedGroups((prev) => {
      const next = { ...prev };
      const hasSingleGroup = treeGroups.length === 1;
      treeGroups.forEach((group) => {
        if (next[group.id] === undefined) {
          if (hasSingleGroup) {
            next[group.id] = true;
          } else {
            next[group.id] = group.isUncategorized;
          }
        }
      });
      return next;
    });
  }, [treeGroups]);

  const handleRuleCategoryChange = async (
    rule: MerchantCategoryRule,
    categoryId: string | null
  ): Promise<void> => {
    if (!categoryId || categoryId === rule.categoryId) {
      setRuleCategoryEdits((prev) => ({ ...prev, [rule.id]: rule.categoryId }));
      return;
    }
    setRuleCategoryEdits((prev) => ({ ...prev, [rule.id]: categoryId }));
    if (savingRuleIds.has(rule.id)) {
      return;
    }
    setSavingRuleIds((prev) => new Set(prev).add(rule.id));
    const nextCategoryId = categoryId;
    try {
      await merchantRuleApi.createMerchantRule({
        merchantKeyword: rule.merchantKeyword,
        categoryId: nextCategoryId,
      });
      showToast("Правило успешно обновлено", "success");
    } catch (error) {
      setRuleCategoryEdits((prev) => ({
        ...prev,
        [rule.id]: rule.categoryId,
      }));
      showToast(
        `Не удалось обновить правило: ${getErrorMessage(error)}`,
        "error"
      );
    } finally {
      setSavingRuleIds((prev) => {
        const next = new Set(prev);
        next.delete(rule.id);
        return next;
      });
    }
  };

  const handleMerchantCategoryChange = async (
    merchantName: string,
    categoryId: string | null
  ): Promise<void> => {
    if (!categoryId) {
      setMerchantCategoryEdits((prev) => ({
        ...prev,
        [merchantName]: "",
      }));
      showToast("Выберите категорию", "error");
      return;
    }
    setMerchantCategoryEdits((prev) => ({
      ...prev,
      [merchantName]: categoryId,
    }));
    if (savingMerchants.has(merchantName)) {
      return;
    }
    setSavingMerchants((prev) => new Set(prev).add(merchantName));
    try {
      await merchantRuleApi.createMerchantRule({
        merchantKeyword: merchantName,
        categoryId,
      });
      showToast("Категория назначена", "success");
    } catch (error) {
      setMerchantCategoryEdits((prev) => ({
        ...prev,
        [merchantName]: "",
      }));
      showToast(
        `Не удалось назначить категорию: ${getErrorMessage(error)}`,
        "error"
      );
    } finally {
      setSavingMerchants((prev) => {
        const next = new Set(prev);
        next.delete(merchantName);
        return next;
      });
    }
  };

  const handleDeleteRule = async (
    rule: MerchantCategoryRule
  ): Promise<void> => {
    setSavingRuleIds((prev) => new Set(prev).add(rule.id));
    try {
      await merchantRuleApi.deleteMerchantRule(rule.id);
      setRules((prev) => prev.filter((item) => item.id !== rule.id));
      setRuleCategoryEdits((prev) => {
        const next = { ...prev };
        delete next[rule.id];
        return next;
      });
      showToast("Правило успешно удалено.", "success");
    } catch (error) {
      showToast(
        `Ошибка при удалении правила: ${getErrorMessage(error)}`,
        "error"
      );
    } finally {
      setSavingRuleIds((prev) => {
        const next = new Set(prev);
        next.delete(rule.id);
        return next;
      });
    }
  };

  const handleToggleGroup = (groupId: string): void => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  const onConfirmAction = async (): Promise<void> => {
    if (confirmModalState.action) {
      setIsConfirming(true);
      await confirmModalState.action();
      setIsConfirming(false);
    }
    setConfirmModalState({
      isOpen: false,
      action: null,
      title: "",
      message: "",
    });
  };

  const requestRuleDelete = (rule: MerchantCategoryRule): void => {
    setConfirmModalState({
      isOpen: true,
      action: () => handleDeleteRule(rule),
      title: "Удалить правило",
      message: `Вы уверены, что хотите удалить правило для "${rule.merchantKeyword}"?`,
    });
  };

  const isPageLoading = isLoading || isLoadingCategories;

  return (
    <>
      <PageMeta {...metadata} />
      <div className="max-w-5xl mx-auto pb-20 dark:text-gray-100">
        <div className="flex flex-col gap-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4 md:items-end">
            <div className="flex-1">
              <TextInputField
                label="Поиск по мерчанту"
                placeholder="Введите мерчанта"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <div className="w-full md:w-72">
              <Select
                label="Фильтр по категории"
                options={categoryOptions}
                value={categoryFilter}
                onChange={(value) => setCategoryFilter(value)}
                disabled={isLoadingCategories || categoryOptions.length === 0}
                placeholder="Все категории"
              />
            </div>
            <Button
              variant="secondary"
              size="small"
              icon={<ArrowPathIcon className="w-4 h-4" />}
              label="Обновить"
              onClick={loadData}
              disabled={isPageLoading}
            />
          </div>
        </div>

        <div className="space-y-8">
          <section className="card-base p-6">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Правила автоматизации
              </h2>
            </div>
            {isPageLoading ? (
              <div className="flex justify-center py-10">
                <Spinner />
              </div>
            ) : treeGroups.length > 0 ? (
              <div className="rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
                {treeGroups.map((group, index) => {
                  const isExpanded = expandedGroups[group.id] ?? false;
                  return (
                    <div
                      key={group.id}
                      className={
                        index === 0
                          ? ""
                          : "border-t border-gray-100 dark:border-gray-800"
                      }
                    >
                      <button
                        type="button"
                        onClick={() => handleToggleGroup(group.id)}
                        className="w-full flex items-center justify-between gap-4 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors cursor-pointer"
                        aria-expanded={isExpanded}
                      >
                        <span className="flex items-center gap-2">
                          {isExpanded ? (
                            <ChevronDownIcon className="w-4 h-4 text-gray-500" />
                          ) : (
                            <ChevronRightIcon className="w-4 h-4 text-gray-500" />
                          )}
                          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            {group.label}
                          </span>
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {group.nodes.length}
                        </span>
                      </button>
                      {isExpanded && (
                        <div className="divide-y divide-gray-100 dark:divide-gray-800">
                          {group.nodes.length > 0 ? (
                            group.nodes.map((node) => {
                              if (node.type === "rule") {
                                const selectedCategoryId =
                                  ruleCategoryEdits[node.rule.id] ??
                                  node.rule.categoryId;
                                const isSaving = savingRuleIds.has(
                                  node.rule.id
                                );
                                return (
                                  <div
                                    key={node.rule.id}
                                    className="flex flex-col md:flex-row md:items-center gap-4 px-4 py-4 bg-white/70 dark:bg-gray-900/60"
                                  >
                                    <div className="flex-1">
                                      <p className="text-sm text-gray-500 dark:text-gray-400">
                                        Мерчант
                                      </p>
                                      <p className="text-base font-semibold text-gray-900 dark:text-gray-100">
                                        {node.rule.merchantKeyword}
                                      </p>
                                    </div>
                                    <div className="w-full md:w-64">
                                      <Select
                                        label="Категория"
                                        options={editOptions}
                                        value={selectedCategoryId}
                                        onChange={(value) =>
                                          handleRuleCategoryChange(
                                            node.rule,
                                            value
                                          )
                                        }
                                        disabled={
                                          editOptions.length === 0 || isSaving
                                        }
                                        placeholder="Выберите категорию"
                                      />
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <button
                                        onClick={() =>
                                          requestRuleDelete(node.rule)
                                        }
                                        className="p-2 rounded-full text-gray-500 hover:bg-red-100 hover:text-red-600 dark:text-gray-400 dark:hover:bg-red-900/50 dark:hover:text-red-400 transition-all cursor-pointer"
                                        aria-label={`Удалить правило для ${node.rule.merchantKeyword}`}
                                        disabled={isSaving}
                                      >
                                        <TrashIcon className="w-5 h-5" />
                                      </button>
                                    </div>
                                  </div>
                                );
                              }

                              const selectedCategoryId =
                                merchantCategoryEdits[
                                  node.merchant.merchantName
                                ] || null;
                              const isSaving = savingMerchants.has(
                                node.merchant.merchantName
                              );
                              return (
                                <div
                                  key={node.merchant.merchantName}
                                  className="flex flex-col md:flex-row md:items-center gap-4 px-4 py-4 bg-white/70 dark:bg-gray-900/60"
                                >
                                  <div className="flex-1">
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                      Мерчант
                                    </p>
                                    <p className="text-base font-semibold text-gray-900 dark:text-gray-100">
                                      {node.merchant.merchantName}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                      Упоминаний в истории: {node.merchant.count}
                                    </p>
                                  </div>
                                  <div className="w-full md:w-64">
                                    <Select
                                      label="Категория"
                                      options={editOptions}
                                      value={selectedCategoryId}
                                      onChange={(value) =>
                                        handleMerchantCategoryChange(
                                          node.merchant.merchantName,
                                          value
                                        )
                                      }
                                      disabled={
                                        editOptions.length === 0 || isSaving
                                      }
                                      placeholder="Выберите категорию"
                                    />
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <div className="px-4 py-4 text-sm text-gray-500 dark:text-gray-400">
                              Нет правил для этой категории.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Правила не найдены.
              </p>
            )}
          </section>
        </div>
      </div>
      <ConfirmModal
        isOpen={confirmModalState.isOpen}
        onClose={() =>
          setConfirmModalState({
            isOpen: false,
            action: null,
            title: "",
            message: "",
          })
        }
        onConfirm={onConfirmAction}
        title={confirmModalState.title}
        message={confirmModalState.message}
        confirmText="Да, удалить"
        isConfirming={isConfirming}
      />
    </>
  );
};

export default AutomationRulesPage;
