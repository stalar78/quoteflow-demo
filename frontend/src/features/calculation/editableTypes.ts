export type TaxMode = "none" | "custom";

export type EditableItem = {
  id: string;
  name: string;
  description: string;
  quantityText: string;
  unit: string;
  unitPriceRublesText: string;
  discountPercentText: string;
};

export type EditableDraft = {
  storageVersion: "1";
  id: string;
  projectName: string;
  clientDisplayName: string;
  clientContactNote: string;
  comment: string;
  items: EditableItem[];
  overallDiscountPercentText: string;
  taxMode: TaxMode;
  taxRatePercentText: string;
  createdAt: string;
  updatedAt: string;
};

export function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createEmptyItem(): EditableItem {
  return {
    id: createId(),
    name: "",
    description: "",
    quantityText: "",
    unit: "шт.",
    unitPriceRublesText: "",
    discountPercentText: "0"
  };
}

export function createNewDraft(now = new Date().toISOString()): EditableDraft {
  return {
    storageVersion: "1",
    id: createId(),
    projectName: "",
    clientDisplayName: "",
    clientContactNote: "",
    comment: "",
    items: [createEmptyItem()],
    overallDiscountPercentText: "0",
    taxMode: "none",
    taxRatePercentText: "0",
    createdAt: now,
    updatedAt: now
  };
}

export function createDemoDraft(now = new Date().toISOString()): EditableDraft {
  return {
    ...createNewDraft(now),
    projectName: "Демонстрационный расчёт",
    clientDisplayName: "Условный клиент",
    clientContactNote: "Только демо-данные, без реальных контактов",
    comment: "Синтетический пример для проверки локального расчёта.",
    items: [
      {
        id: createId(),
        name: "Анализ требований",
        description: "Сбор вводных и подготовка структуры расчёта.",
        quantityText: "3",
        unit: "час",
        unitPriceRublesText: "2500",
        discountPercentText: "0"
      },
      {
        id: createId(),
        name: "Прототип интерфейса",
        description: "Нейтральный демо-этап без привязки к реальному клиенту.",
        quantityText: "2,5",
        unit: "услуга",
        unitPriceRublesText: "12000,50",
        discountPercentText: "10"
      }
    ],
    overallDiscountPercentText: "5",
    taxMode: "custom",
    taxRatePercentText: "20"
  };
}
