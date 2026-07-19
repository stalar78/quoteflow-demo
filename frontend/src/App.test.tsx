import "@testing-library/jest-dom/vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";
import { createNewDraft, type EditableDraft } from "./features/calculation/editableTypes";
import {
  formatMoney,
  parseMoneyToMinor,
  parsePercentToBasisPoints
} from "./features/calculation/inputAdapters";
import { DRAFT_STORAGE_KEY } from "./features/drafts/draftStorage";
import { serializeCalculationEnvelope } from "./features/exchange/dataExchange";

function renderApp() {
  return {
    user: userEvent.setup(),
    ...render(<App />)
  };
}

async function fillValidSingleItem(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Название", { selector: "input" }), "Прототип");
  await user.type(screen.getByLabelText("Количество"), "2");
  await user.clear(screen.getByLabelText("Цена, ₽"));
  await user.type(screen.getByLabelText("Цена, ₽"), "1500");
}

function storedDraft(projectName = "Сохранённый расчёт"): EditableDraft {
  return {
    ...createNewDraft("2026-07-18T10:00:00.000Z"),
    id: "draft-1",
    projectName,
    updatedAt: "2026-07-18T11:00:00.000Z",
    items: [
      {
        id: "item-1",
        name: "Работа",
        description: "",
        quantityText: "1",
        unit: "час",
        unitPriceRublesText: "100",
        discountPercentText: "0"
      }
    ]
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });
  return { promise, resolve, reject };
}

function matchingApiResponse(body: { items: Array<{ id: string }> }, requestId = "ui-test") {
  return new Response(
    JSON.stringify({
      requestId,
      calculation: {
        items: [
          {
            itemId: body.items[0].id,
            lineGrossMinor: 300000,
            lineDiscountMinor: 0,
            lineTotalMinor: 300000
          }
        ],
        subtotalMinor: 300000,
        overallDiscountMinor: 0,
        amountAfterDiscountMinor: 300000,
        taxMinor: 0,
        totalMinor: 300000,
        currency: "RUB",
        calculationVersion: "1"
      }
    }),
    { headers: { "content-type": "application/json" } }
  );
}

describe("QuoteFlow UI", () => {
  beforeEach(() => {
    vi.useRealTimers();
    localStorage.removeItem(DRAFT_STORAGE_KEY);
    vi.restoreAllMocks();
  });

  it("renders the app and visible demo warning", () => {
    renderApp();

    expect(screen.getByText("QuoteFlow")).toBeInTheDocument();
    expect(screen.getByText("Демонстрационный инструмент")).toBeInTheDocument();
    expect(screen.getByText(/Не вводите реальные персональные/)).toBeInTheDocument();
  });

  it("starts with one empty item", () => {
    renderApp();

    expect(screen.getByText("Позиция 1")).toBeInTheDocument();
    expect(screen.getAllByLabelText("Название", { selector: "input" })).toHaveLength(1);
  });

  it("does not show required-field validation before interaction", () => {
    renderApp();

    expect(screen.queryByText("Укажите название позиции")).not.toBeInTheDocument();
    expect(screen.queryByText("Заполните количество")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Название", { selector: "input" })).not.toHaveAttribute(
      "aria-invalid"
    );
  });

  it("shows a required-field error after blur", async () => {
    const { user } = renderApp();

    await user.click(screen.getByLabelText("Название", { selector: "input" }));
    await user.tab();

    expect(screen.getByText("Укажите название позиции")).toBeInTheDocument();
  });

  it("clears a touched-field error as soon as the value is valid", async () => {
    const { user } = renderApp();
    const nameInput = screen.getByLabelText("Название", { selector: "input" });

    await user.click(nameInput);
    await user.tab();
    expect(screen.getByText("Укажите название позиции")).toBeInTheDocument();

    await user.type(nameInput, "Прототип");

    expect(screen.queryByText("Укажите название позиции")).not.toBeInTheDocument();
  });

  it("adds an item", async () => {
    const { user } = renderApp();

    await user.click(screen.getByRole("button", { name: "Добавить позицию" }));

    expect(screen.getByText("Позиция 2")).toBeInTheDocument();
  });

  it("adds a new item with neutral untouched fields", async () => {
    const { user } = renderApp();

    await user.click(screen.getByLabelText("Название", { selector: "input" }));
    await user.tab();
    await user.click(screen.getByRole("button", { name: "Добавить позицию" }));

    const secondItem = screen.getByText("Позиция 2").closest("article")!;
    expect(within(secondItem).getByLabelText("Название", { selector: "input" })).not.toHaveAttribute(
      "aria-invalid"
    );
    expect(screen.getAllByText("Укажите название позиции")).toHaveLength(1);
  });

  it("removes an item", async () => {
    const { user } = renderApp();
    await user.click(screen.getByRole("button", { name: "Добавить позицию" }));

    await user.click(screen.getAllByRole("button", { name: "Удалить" })[1]);

    expect(screen.queryByText("Позиция 2")).not.toBeInTheDocument();
    expect(screen.getByText("Позиция 1")).toBeInTheDocument();
  });

  it("does not leave the form without an item after removing the final item", async () => {
    const { user } = renderApp();

    await user.click(screen.getByRole("button", { name: "Удалить" }));

    expect(screen.getByText("Позиция 1")).toBeInTheDocument();
    expect(screen.getAllByLabelText("Название", { selector: "input" })).toHaveLength(1);
  });

  it("displays expected totals for a valid calculation", async () => {
    const { user } = renderApp();

    await fillValidSingleItem(user);

    expect(screen.getAllByText("3 000,00 ₽").length).toBeGreaterThan(0);
  });

  it("supports fractional quantity", async () => {
    const { user } = renderApp();

    await user.type(screen.getByLabelText("Название", { selector: "input" }), "Анализ");
    await user.type(screen.getByLabelText("Количество"), "1.5");
    await user.type(screen.getByLabelText("Цена, ₽"), "1000");

    expect(screen.getAllByText("1 500,00 ₽").length).toBeGreaterThan(0);
  });

  it("normalizes comma quantity to the canonical calculation format", async () => {
    const { user } = renderApp();

    await user.type(screen.getByLabelText("Название", { selector: "input" }), "Анализ");
    await user.type(screen.getByLabelText("Количество"), "1,5");
    await user.type(screen.getByLabelText("Цена, ₽"), "1000");

    expect(screen.getAllByText("1 500,00 ₽").length).toBeGreaterThan(0);
  });

  it("converts rubles to kopecks exactly", () => {
    expect(parseMoneyToMinor("12000,50")).toEqual({ ok: true, value: 1_200_050 });
    expect(parseMoneyToMinor("0.01")).toEqual({ ok: true, value: 1 });
  });

  it("converts percent to basis points exactly", () => {
    expect(parsePercentToBasisPoints("12,34")).toEqual({ ok: true, value: 1234 });
    expect(parsePercentToBasisPoints("100")).toEqual({ ok: true, value: 10000 });
  });

  it("formats money exactly across the safe minor-unit range", () => {
    expect(formatMoney(0)).toBe("0,00 ₽");
    expect(formatMoney(1)).toBe("0,01 ₽");
    expect(formatMoney(1_200_050)).toBe("12 000,50 ₽");
    expect(formatMoney(8_999_999_999_999_998)).toBe("89 999 999 999 999,98 ₽");
    expect(formatMoney(8_999_999_999_999_999)).toBe("89 999 999 999 999,99 ₽");
  });

  it("shows a field error for invalid price after blur", async () => {
    const { user } = renderApp();

    await user.type(screen.getByLabelText("Цена, ₽"), "12.999");
    await user.tab();

    expect(screen.getByText("Введите корректную цену")).toBeInTheDocument();
    expect(screen.getByLabelText("Цена, ₽")).toHaveAttribute("aria-invalid", "true");
  });

  it("shows a field error for invalid discount after blur", async () => {
    const { user } = renderApp();

    await user.clear(screen.getByLabelText("Скидка, %"));
    await user.type(screen.getByLabelText("Скидка, %"), "150");
    await user.tab();

    expect(screen.getByText("Скидка должна быть от 0 до 100%")).toBeInTheDocument();
  });

  it("resets visible errors when starting a new calculation", async () => {
    const { user } = renderApp();

    await user.click(screen.getByLabelText("Название", { selector: "input" }));
    await user.tab();
    expect(screen.getByText("Укажите название позиции")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Новый расчёт" }));

    expect(screen.queryByText("Укажите название позиции")).not.toBeInTheDocument();
  });

  it("does not retain obsolete errors after filling the demo example", async () => {
    const { user } = renderApp();

    await user.click(screen.getByLabelText("Название", { selector: "input" }));
    await user.tab();
    expect(screen.getByText("Укажите название позиции")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Заполнить демо-пример" }));

    expect(screen.queryByText("Укажите название позиции")).not.toBeInTheDocument();
    expect(screen.getByDisplayValue("Демонстрационный расчёт")).toBeInTheDocument();
  });

  it("does not show a misleading total for an incomplete item", () => {
    renderApp();

    expect(screen.getByText("Черновик пока неполный.")).toBeInTheDocument();
    expect(screen.getByText("Заполните обязательные поля")).toBeInTheDocument();
    expect(screen.queryByText(/^Всего$/)).not.toBeInTheDocument();
  });

  it("presents line total as output instead of an input", async () => {
    const { user } = renderApp();

    await fillValidSingleItem(user);

    expect(screen.getByLabelText("Итого по позиции 1").tagName).toBe("OUTPUT");
    expect(screen.getByLabelText("Итого по позиции 1")).toHaveTextContent("3 000,00 ₽");
  });

  it("exposes accessible section headings and controls", () => {
    renderApp();

    expect(screen.getByRole("heading", { name: "Расчёт коммерческого предложения" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "О расчёте" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Позиции" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Скидки и налог" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Итог" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Черновики" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Новый расчёт" })).toBeInTheDocument();
  });

  it("supports a 100% item discount", async () => {
    const { user } = renderApp();

    await user.type(screen.getByLabelText("Название", { selector: "input" }), "Бонус");
    await user.type(screen.getByLabelText("Количество"), "1");
    await user.type(screen.getByLabelText("Цена, ₽"), "1000");
    await user.clear(screen.getByLabelText("Скидка, %"));
    await user.type(screen.getByLabelText("Скидка, %"), "100");

    expect(screen.getAllByText("0,00 ₽").length).toBeGreaterThan(0);
  });

  it("applies overall discount before tax", async () => {
    const { user } = renderApp();

    await user.type(screen.getByLabelText("Название", { selector: "input" }), "Работа");
    await user.type(screen.getByLabelText("Количество"), "1");
    await user.type(screen.getByLabelText("Цена, ₽"), "1000");
    await user.clear(screen.getByLabelText("Общая скидка, %"));
    await user.type(screen.getByLabelText("Общая скидка, %"), "10");
    await user.click(screen.getByLabelText("Указать ставку"));
    await user.clear(screen.getByLabelText("Ставка налога, %"));
    await user.type(screen.getByLabelText("Ставка налога, %"), "20");

    expect(screen.getAllByText("1 080,00 ₽").length).toBeGreaterThan(0);
    expect(screen.getAllByText("180,00 ₽").length).toBeGreaterThan(0);
  });

  it("saves a draft", async () => {
    const { user } = renderApp();

    await user.type(screen.getByLabelText("Название проекта"), "Новый расчёт");
    await user.click(screen.getByRole("button", { name: "Сохранить черновик" }));

    expect(screen.getByText("Черновик сохранён.")).toBeInTheDocument();
    const draftsPanel = screen.getByRole("heading", { name: "Черновики" }).closest("section")!;
    expect(within(draftsPanel).getByText("Новый расчёт")).toBeInTheDocument();
  });

  it("updates an existing draft", async () => {
    const { user } = renderApp();

    await user.type(screen.getByLabelText("Название проекта"), "Версия");
    await user.click(screen.getByRole("button", { name: "Сохранить черновик" }));
    await user.type(screen.getByLabelText("Название проекта"), " 2");
    await user.click(screen.getByRole("button", { name: "Сохранить черновик" }));

    const stored = JSON.parse(localStorage.getItem(DRAFT_STORAGE_KEY) ?? "{}");
    expect(stored.drafts).toHaveLength(1);
    expect(screen.getByText("Версия 2")).toBeInTheDocument();
  });

  it("opens a saved draft", async () => {
    localStorage.setItem(
      DRAFT_STORAGE_KEY,
      JSON.stringify({ storageVersion: "1", drafts: [storedDraft()] })
    );
    const { user } = renderApp();

    await user.click(screen.getByRole("button", { name: "Открыть" }));

    expect(screen.getByDisplayValue("Сохранённый расчёт")).toBeInTheDocument();
  });

  it("deletes one draft", async () => {
    localStorage.setItem(
      DRAFT_STORAGE_KEY,
      JSON.stringify({ storageVersion: "1", drafts: [storedDraft()] })
    );
    const { user } = renderApp();

    const draftsPanel = screen.getByRole("heading", { name: "Черновики" }).closest("section")!;
    await user.click(within(draftsPanel).getByRole("button", { name: "Удалить" }));

    expect(screen.queryByText("Сохранённый расчёт")).not.toBeInTheDocument();
    expect(screen.getByText("Сохранённых черновиков пока нет.")).toBeInTheDocument();
  });

  it("clears drafts without calling localStorage.clear", async () => {
    const clearSpy = vi.spyOn(Storage.prototype, "clear");
    localStorage.setItem(
      DRAFT_STORAGE_KEY,
      JSON.stringify({ storageVersion: "1", drafts: [storedDraft()] })
    );
    const { user } = renderApp();

    await user.click(screen.getByRole("button", { name: "Очистить все черновики" }));

    expect(clearSpy).not.toHaveBeenCalled();
    expect(localStorage.getItem(DRAFT_STORAGE_KEY)).toBeNull();
  });

  it("handles corrupted localStorage JSON", () => {
    localStorage.setItem(DRAFT_STORAGE_KEY, "{broken");

    renderApp();

    expect(screen.getByText("Сохранённые черновики повреждены и не были загружены.")).toBeInTheDocument();
  });

  it("handles unsupported storage version", () => {
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({ storageVersion: "2", drafts: [] }));

    renderApp();

    expect(
      screen.getByText("Сохранённые черновики имеют неподдерживаемый формат и не были загружены.")
    ).toBeInTheDocument();
  });

  it("reports storage write failure", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    const { user } = renderApp();

    await user.click(screen.getByRole("button", { name: "Сохранить черновик" }));

    expect(screen.getByText("Не удалось сохранить черновик в браузере.")).toBeInTheDocument();
  });

  it("shows the empty drafts state", () => {
    renderApp();

    expect(screen.getByText("Сохранённых черновиков пока нет.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Очистить все черновики" })).toBeDisabled();
  });

  it("renders Unicode and long layout-sensitive values without crashing", async () => {
    renderApp();
    const longText = "ДлинноеНазваниеБезПробелов".repeat(10);

    fireEvent.change(screen.getByLabelText("Название проекта"), {
      target: { value: `${longText} ✅` }
    });
    fireEvent.change(screen.getByLabelText("Название", { selector: "input" }), {
      target: { value: longText }
    });

    expect(screen.getByDisplayValue(`${longText} ✅`)).toBeInTheDocument();
    expect(within(screen.getByText("Позиция 1").closest("article")!).getByDisplayValue(longText)).toBeInTheDocument();
  });

  it("shows payload preview only for a valid strict input", async () => {
    const { user } = renderApp();

    expect(screen.getByText("Заполните расчёт, чтобы увидеть строгий payload.")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Название проекта"), "API preview");
    await fillValidSingleItem(user);

    const preview = screen.getByText(/"schemaVersion": "1"/);
    expect(preview).toHaveTextContent('"projectName": "API preview"');
    expect(preview).not.toHaveTextContent("totalMinor");
    expect(preview).not.toHaveTextContent("createdAt");
  });

  it("renders data exchange outside the sticky sidebar", () => {
    renderApp();

    const exchange = screen.getByRole("heading", { name: "Обмен данными" }).closest("section")!;
    const sidebar = screen.getByRole("heading", { name: "Черновики" }).closest("aside")!;

    expect(sidebar).not.toContainElement(exchange);
  });

  it("does not call the preview API automatically", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}"));
    const { user } = renderApp();

    await user.type(screen.getByLabelText("Название проекта"), "API preview");
    await fillValidSingleItem(user);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends preview API request only after explicit click", async () => {
    vi.spyOn(crypto, "getRandomValues").mockImplementation((array) => {
      (array as Uint8Array).fill(1);
      return array;
    });
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (_url, init) => {
      const body = JSON.parse((init as RequestInit).body as string);
      return new Response(
        JSON.stringify({
          requestId: "ui-test",
          calculation: {
            items: [
              {
                itemId: body.items[0].id,
                lineGrossMinor: 300000,
                lineDiscountMinor: 0,
                lineTotalMinor: 300000
              }
            ],
            subtotalMinor: 300000,
            overallDiscountMinor: 0,
            amountAfterDiscountMinor: 300000,
            taxMinor: 0,
            totalMinor: 300000,
            currency: "RUB",
            calculationVersion: "1"
          }
        }),
        { headers: { "content-type": "application/json" } }
      );
    });
    const { user } = renderApp();

    await user.type(screen.getByLabelText("Название проекта"), "API preview");
    await fillValidSingleItem(user);
    await user.click(screen.getByRole("button", { name: "Проверить через API" }));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0];
    expect(fetchMock.mock.calls[0][0]).toBe("/api/v1/calculations/preview");
    expect((init as RequestInit).method).toBe("POST");
    expect((init as RequestInit).headers).toEqual({
      "Content-Type": "application/json",
      "X-Request-ID": "ui-01010101010101010101010101010101"
    });
    expect(JSON.parse((init as RequestInit).body as string)).not.toHaveProperty("totalMinor");
    expect(await screen.findByText("Backend result совпадает с локальным расчётом.")).toBeInTheDocument();
  });

  it("shows loading state and allows replacing an in-flight API request", async () => {
    const first = deferred<Response>();
    const second = deferred<Response>();
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementationOnce(async () => first.promise)
      .mockImplementationOnce(async (_url, init) => {
        const body = JSON.parse((init as RequestInit).body as string);
        return second.promise.then(() => matchingApiResponse(body, "ui-second"));
      });
    const { user } = renderApp();

    await user.type(screen.getByLabelText("Название проекта"), "API preview");
    await fillValidSingleItem(user);
    await user.click(screen.getByRole("button", { name: "Проверить через API" }));

    expect(screen.getByText("Отправляем расчёт в API...")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Повторить запрос" })).toBeEnabled();

    await user.click(screen.getByRole("button", { name: "Повторить запрос" }));
    second.resolve(new Response());

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(await screen.findByText("Backend result совпадает с локальным расчётом.")).toBeInTheDocument();
    expect(screen.getByText(/ui-second/)).toBeInTheDocument();
  });

  it("shows a specific timeout message and clears timeout handles", async () => {
    vi.useFakeTimers();
    vi.spyOn(globalThis, "fetch").mockImplementation(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          (init as RequestInit).signal?.addEventListener("abort", () =>
            reject(new DOMException("aborted", "AbortError"))
          );
        })
    );
    renderApp();

    fireEvent.change(screen.getByLabelText("Название проекта"), {
      target: { value: "API preview" }
    });
    fireEvent.change(screen.getByLabelText("Название", { selector: "input" }), {
      target: { value: "Прототип" }
    });
    fireEvent.change(screen.getByLabelText("Количество"), {
      target: { value: "2" }
    });
    fireEvent.change(screen.getByLabelText("Цена, ₽"), {
      target: { value: "1500" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Проверить через API" }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });

    expect(screen.getByText("API не ответил за 10 секунд. Повторите запрос.")).toBeInTheDocument();
    expect(vi.getTimerCount()).toBe(0);
    vi.useRealTimers();
  });

  it("aborts API preview on calculation edit without announcing stale aborts", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          (init as RequestInit).signal?.addEventListener("abort", () =>
            reject(new DOMException("aborted", "AbortError"))
          );
        })
    );
    const { user } = renderApp();

    await user.type(screen.getByLabelText("Название проекта"), "API preview");
    await fillValidSingleItem(user);
    await user.click(screen.getByRole("button", { name: "Проверить через API" }));
    await user.type(screen.getByLabelText("Название проекта"), " updated");

    expect(await screen.findByText("API preview сброшен после изменения расчёта.")).toBeInTheDocument();
    expect(screen.queryByText("Запрос отменён.")).not.toBeInTheDocument();
  });

  it("ignores a late obsolete API response that resolves after a newer request", async () => {
    const first = deferred<Response>();
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementationOnce(async (_url, init) => {
        const body = JSON.parse((init as RequestInit).body as string);
        return first.promise.then(() => matchingApiResponse(body, "ui-first-late"));
      })
      .mockImplementationOnce(async (_url, init) => {
        const body = JSON.parse((init as RequestInit).body as string);
        return matchingApiResponse(body, "ui-second-current");
      });
    const { user } = renderApp();

    await user.type(screen.getByLabelText("Название проекта"), "API preview");
    await fillValidSingleItem(user);
    await user.click(screen.getByRole("button", { name: "Проверить через API" }));
    await user.click(screen.getByRole("button", { name: "Повторить запрос" }));
    expect(await screen.findByText(/ui-second-current/)).toBeInTheDocument();

    first.resolve(new Response());
    await Promise.resolve();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(screen.queryByText(/ui-first-late/)).not.toBeInTheDocument();
    expect(screen.getByText(/ui-second-current/)).toBeInTheDocument();
  });

  it("shows a discrepancy when backend preview differs from the local result", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (_url, init) => {
      const body = JSON.parse((init as RequestInit).body as string);
      return new Response(
        JSON.stringify({
          requestId: "ui-mismatch",
          calculation: {
            items: [
              {
                itemId: body.items[0].id,
                lineGrossMinor: 300000,
                lineDiscountMinor: 0,
                lineTotalMinor: 300001
              }
            ],
            subtotalMinor: 300001,
            overallDiscountMinor: 0,
            amountAfterDiscountMinor: 300001,
            taxMinor: 0,
            totalMinor: 300001,
            currency: "RUB",
            calculationVersion: "1"
          }
        }),
        { headers: { "content-type": "application/json" } }
      );
    });
    const { user } = renderApp();

    await user.type(screen.getByLabelText("Название проекта"), "API preview");
    await fillValidSingleItem(user);
    await user.click(screen.getByRole("button", { name: "Проверить через API" }));

    expect(await screen.findByText("Backend result отличается от локального расчёта.")).toBeInTheDocument();
    expect(screen.getByText(/ui-mismatch/)).toBeInTheDocument();
  });

  it("keeps the current draft after failed JSON import", async () => {
    const { user } = renderApp();

    await user.type(screen.getByLabelText("Название проекта"), "Текущий");
    const input = screen.getByLabelText("Импорт JSON", { selector: "input" });
    await user.upload(input, new File(["{"], "bad.json", { type: "application/json" }));

    expect(screen.getByDisplayValue("Текущий")).toBeInTheDocument();
    expect(screen.getByText("Файл не является корректным JSON.")).toBeInTheDocument();
  });

  it("imports valid JSON and resets touched validation state", async () => {
    const { user } = renderApp();
    const envelope = serializeCalculationEnvelope({
      schemaVersion: "1",
      projectName: "Импортированный",
      client: { displayName: "", contactNote: "" },
      items: [
        {
          id: "import-item",
          name: "Импорт",
          description: "",
          quantity: "1.5",
          unit: "час",
          unitPriceMinor: 1200050,
          discountBasisPoints: 1234
        }
      ],
      overallDiscountBasisPoints: 500,
      taxBasisPoints: 0,
      comment: "",
      currency: "RUB"
    });

    await user.click(screen.getByLabelText("Название", { selector: "input" }));
    await user.tab();
    expect(screen.getByText("Укажите название позиции")).toBeInTheDocument();

    const input = screen.getByLabelText("Импорт JSON", { selector: "input" });
    await user.upload(input, new File([envelope], "quote.json", { type: "application/json" }));

    expect(screen.getByDisplayValue("Импортированный")).toBeInTheDocument();
    expect(screen.getByDisplayValue("12000.50")).toBeInTheDocument();
    expect(screen.getByDisplayValue("12.34")).toBeInTheDocument();
    expect(screen.queryByText("Укажите название позиции")).not.toBeInTheDocument();
    expect(screen.getByText("JSON импортирован. Черновик заменён после строгой проверки.")).toBeInTheDocument();
  });
});
