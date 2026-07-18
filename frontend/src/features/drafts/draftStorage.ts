import type { EditableDraft, EditableItem } from "../calculation/editableTypes";

export const DRAFT_STORAGE_KEY = "quoteflow:drafts:v1";

type DraftEnvelope = {
  storageVersion: "1";
  drafts: EditableDraft[];
};

type LoadResult = {
  drafts: EditableDraft[];
  warning?: string;
};

type SaveResult =
  | { ok: true; drafts: EditableDraft[]; draft: EditableDraft }
  | { ok: false; message: string };

type ListMutationResult =
  | { ok: true; drafts: EditableDraft[] }
  | { ok: false; message: string };

export function loadDrafts(): LoadResult {
  try {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) {
      return { drafts: [] };
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!isEnvelope(parsed)) {
      return {
        drafts: [],
        warning: "Сохранённые черновики имеют неподдерживаемый формат и не были загружены."
      };
    }
    const drafts = parsed.drafts.filter(isEditableDraft);
    const warning =
      drafts.length === parsed.drafts.length
        ? undefined
        : "Часть сохранённых черновиков была пропущена из-за повреждённых данных.";
    return { drafts: sortDrafts(drafts), warning };
  } catch {
    return {
      drafts: [],
      warning: "Сохранённые черновики повреждены и не были загружены."
    };
  }
}

export function saveDraft(draft: EditableDraft): SaveResult {
  try {
    const loaded = loadDrafts();
    const now = new Date().toISOString();
    const updatedDraft = { ...draft, updatedAt: now, createdAt: draft.createdAt || now };
    const withoutCurrent = loaded.drafts.filter((candidate) => candidate.id !== draft.id);
    const drafts = sortDrafts([updatedDraft, ...withoutCurrent]);
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({ storageVersion: "1", drafts }));
    return { ok: true, draft: updatedDraft, drafts };
  } catch {
    return { ok: false, message: "Не удалось сохранить черновик в браузере." };
  }
}

export function deleteDraft(id: string): ListMutationResult {
  try {
    const drafts = loadDrafts().drafts.filter((draft) => draft.id !== id);
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({ storageVersion: "1", drafts }));
    return { ok: true, drafts };
  } catch {
    return { ok: false, message: "Не удалось удалить черновик." };
  }
}

export function clearDrafts(): ListMutationResult {
  try {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
    return { ok: true, drafts: [] };
  } catch {
    return { ok: false, message: "Не удалось очистить черновики QuoteFlow." };
  }
}

function sortDrafts(drafts: EditableDraft[]): EditableDraft[] {
  return [...drafts].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

function isEnvelope(value: unknown): value is DraftEnvelope {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { storageVersion?: unknown }).storageVersion === "1" &&
    Array.isArray((value as { drafts?: unknown }).drafts)
  );
}

function isEditableDraft(value: unknown): value is EditableDraft {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const draft = value as EditableDraft;
  return (
    draft.storageVersion === "1" &&
    isString(draft.id) &&
    isString(draft.projectName) &&
    isString(draft.clientDisplayName) &&
    isString(draft.clientContactNote) &&
    isString(draft.comment) &&
    isString(draft.overallDiscountPercentText) &&
    (draft.taxMode === "none" || draft.taxMode === "custom") &&
    isString(draft.taxRatePercentText) &&
    isString(draft.createdAt) &&
    isString(draft.updatedAt) &&
    Array.isArray(draft.items) &&
    draft.items.every(isEditableItem)
  );
}

function isEditableItem(value: unknown): value is EditableItem {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const item = value as EditableItem;
  return (
    isString(item.id) &&
    isString(item.name) &&
    isString(item.description) &&
    isString(item.quantityText) &&
    isString(item.unit) &&
    isString(item.unitPriceRublesText) &&
    isString(item.discountPercentText)
  );
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}
