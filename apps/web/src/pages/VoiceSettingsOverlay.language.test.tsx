// @vitest-environment jsdom

import type * as UiWeb from "@rakazo/ui-web";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ComponentProps, ReactNode } from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { VoiceSettingsOverlay } from "./VoiceSettingsOverlay";

const voice = vi.hoisted(() => ({
  catalog: vi.fn(),
  credentials: vi.fn(),
  status: vi.fn(),
  voices: vi.fn(),
  connect: vi.fn(),
  disconnect: vi.fn(),
  setVoice: vi.fn(),
  setSpeechModel: vi.fn(),
  setCatalogLanguage: vi.fn(),
}));

vi.mock("../lib/tts.js", () => ({ speaker: { speak: vi.fn(), state: {} } }));
vi.mock("../lib/call-session", () => ({ useCallSession: () => null }));
vi.mock("../lib/rpc", () => ({
  rpc: { voice },
  rpcForSpace: () => ({ voice }),
  createSpaceRpc: () => ({ voice }),
  selectedSpaceId: () => null,
}));
vi.mock("@lingui/react/macro", () => {
  const t = (parts: TemplateStringsArray) => parts.join("");
  return { useLingui: () => ({ t }), Trans: ({ children }: { children: ReactNode }) => children };
});
vi.mock("@rakazo/ui-web", async (importOriginal) => {
  const { OptionSelect } = await importOriginal<typeof UiWeb>();
  const Container = ({ children }: { children?: ReactNode }) => <div>{children}</div>;
  return {
    Spinner: (props: ComponentProps<"svg">) => <svg role="status" {...props} />,
    Button: (props: ComponentProps<"button">) => <button {...props} />,
    Dialog: Container,
    DialogClose: Container,
    DialogContent: Container,
    DialogTitle: Container,
    Field: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
    FieldLabel: ({ children, htmlFor }: { children?: ReactNode; htmlFor?: string }) => (
      <label htmlFor={htmlFor}>{children}</label>
    ),
    Input: (props: ComponentProps<"input">) => <input {...props} />,
    OptionSelect,
  };
});

const fish = {
  id: "cred-fish",
  provider: "fish-audio",
  hasKey: true,
  isDefault: true,
  voiceId: "voice-1",
  speechModel: "",
  transcribe: true,
};

function selects(container: HTMLElement) {
  return [...container.querySelectorAll<HTMLElement>('[role="combobox"]')];
}

async function choose(trigger: HTMLElement | undefined, label: string) {
  if (!trigger) throw new Error("Missing select");
  await act(async () => trigger.click());
  const option = [...document.querySelectorAll<HTMLElement>('[role="option"]')].find((entry) =>
    entry.textContent?.startsWith(label),
  );
  if (!option) throw new Error(`Missing option ${label}`);
  await act(async () => option.click());
}

it("filters a voice catalog by language and remembers every language", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  voice.catalog.mockResolvedValue([
    { id: "fish-audio", name: "Fish Audio", description: "", transcribe: true, languages: true },
    { id: "openai", name: "OpenAI", description: "", transcribe: true },
  ]);
  voice.credentials.mockResolvedValue([fish]);
  voice.status.mockResolvedValue({
    configured: true,
    ready: true,
    transcribe: true,
    provider: "fish-audio",
    voiceId: "voice-1",
  });
  voice.voices.mockResolvedValue([{ id: "voice-1", label: "Aria" }]);
  voice.setCatalogLanguage.mockImplementation(
    async ({ catalogLanguage }: { catalogLanguage: string }) => ({ ...fish, catalogLanguage }),
  );
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  try {
    await act(async () => {
      root.render(
        <QueryClientProvider
          client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
        >
          <VoiceSettingsOverlay embedded scope="account" onClose={() => undefined} />
        </QueryClientProvider>,
      );
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(container.textContent).toContain("Language");
    expect(voice.voices).toHaveBeenCalledWith(
      expect.objectContaining({ provider: "fish-audio", scope: "account", language: "en" }),
      expect.anything(),
    );
    await choose(selects(container)[1], "Deutsch");
    expect(voice.setCatalogLanguage).toHaveBeenCalledWith({
      scope: "account",
      provider: "fish-audio",
      catalogLanguage: "de",
    });
    expect(voice.voices).toHaveBeenCalledWith(
      expect.objectContaining({ language: "de" }),
      expect.anything(),
    );
    await choose(selects(container)[1], "All languages");
    expect(voice.setCatalogLanguage).toHaveBeenCalledWith(
      expect.objectContaining({ catalogLanguage: "" }),
    );
    expect(voice.voices).toHaveBeenCalledWith(
      expect.objectContaining({ language: "" }),
      expect.anything(),
    );
    await choose(selects(container)[0], "OpenAI");
    await act(async () => {
      await Promise.resolve();
    });
    expect(container.textContent).not.toContain("Language");
  } finally {
    await act(async () => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  }
});
