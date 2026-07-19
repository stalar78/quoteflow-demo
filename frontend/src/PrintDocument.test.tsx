import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";
import { DRAFT_STORAGE_KEY } from "./features/drafts/draftStorage";

function renderApp() {
  return {
    user: userEvent.setup(),
    ...render(<App />)
  };
}

async function fillValidCalculation(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Название проекта"), "Печатный расчёт");
  await user.type(screen.getByLabelText("Название", { selector: "input" }), "Прототип");
  await user.type(screen.getByLabelText("Количество"), "2");
  await user.type(screen.getByLabelText("Цена, ₽"), "1500");
}

describe("QuoteFlow print representation", () => {
  beforeEach(() => {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
    vi.restoreAllMocks();
  });

  it("shows the print action only for a valid calculation", async () => {
    const { user } = renderApp();

    expect(screen.queryByRole("button", { name: "Печать / сохранить PDF" })).not.toBeInTheDocument();

    await fillValidCalculation(user);

    expect(screen.getByRole("button", { name: "Печать / сохранить PDF" })).toBeInTheDocument();
  });

  it("calls window.print when the print action is clicked", async () => {
    const printSpy = vi.spyOn(window, "print").mockImplementation(() => undefined);
    const { user } = renderApp();

    await fillValidCalculation(user);
    await user.click(screen.getByRole("button", { name: "Печать / сохранить PDF" }));

    expect(printSpy).toHaveBeenCalledTimes(1);
  });

  it("does not expose the print action for incomplete drafts", () => {
    renderApp();

    expect(screen.queryByRole("button", { name: "Печать / сохранить PDF" })).not.toBeInTheDocument();
  });

  it("does not expose print output for a valid calculation with a blank project name", async () => {
    const { user } = renderApp();

    await user.type(screen.getByLabelText("Название", { selector: "input" }), "Прототип");
    await user.type(screen.getByLabelText("Количество"), "2");
    await user.type(screen.getByLabelText("Цена, ₽"), "1500");

    expect(screen.getAllByText("3 000,00 ₽").length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: "Печать / сохранить PDF" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Печатная версия расчёта")).not.toBeInTheDocument();
  });

  it("renders the print representation from evaluated input and result", async () => {
    const { user } = renderApp();

    await fillValidCalculation(user);

    const printDocument = screen.getByLabelText("Печатная версия расчёта");
    expect(within(printDocument).getByText("Печатный расчёт")).toBeInTheDocument();
    expect(within(printDocument).getByText("Прототип")).toBeInTheDocument();
    expect(within(printDocument).getAllByText("3 000,00 ₽").length).toBeGreaterThan(0);
  });

  it("renders Russian and long print content without crashing", async () => {
    const { user } = renderApp();
    const longText = "ДлинныйПечатныйТекст".repeat(6);

    fireEvent.change(screen.getByLabelText("Название проекта"), {
      target: { value: longText }
    });
    fireEvent.change(screen.getByLabelText("Условное имя клиента"), {
      target: { value: "Условный клиент" }
    });
    await user.type(screen.getByLabelText("Название", { selector: "input" }), "Проверка печати");
    await user.type(screen.getByLabelText("Количество"), "1");
    await user.type(screen.getByLabelText("Цена, ₽"), "100");

    const printDocument = screen.getByLabelText("Печатная версия расчёта");
    expect(within(printDocument).getByText(longText)).toBeInTheDocument();
    expect(within(printDocument).getAllByText("Условный клиент").length).toBeGreaterThan(0);
  });
});
