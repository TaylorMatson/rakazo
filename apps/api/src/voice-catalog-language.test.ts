import type { Actor } from "@rakazo/contracts";
import { describe, expect, it, vi } from "vitest";
import type { VoiceDeps } from "./voice.js";
import { catalogLanguageValue, updateVoiceCatalogLanguage, voiceListingLanguage } from "./voice.js";

const actor = { userId: "user-1", spaceId: "space-1" } as Actor;

describe("catalog language", () => {
  it("keeps a primary subtag and treats blank as every language", () => {
    expect(catalogLanguageValue(" de-DE ")).toBe("de");
    expect(catalogLanguageValue(" ")).toBe("");
    expect(() => catalogLanguageValue("english")).toThrow("That language is not valid.");
  });

  function languageDeps(
    preference: { voiceId: string; isDefault: boolean } | null,
    { overridden = false, provider = "fish-audio", locale = "fr" } = {},
  ) {
    const credential = {
      id: "cred-1",
      userId: actor.userId,
      provider,
      secretId: "secret-1",
    };
    const table = () => ({
      findUnique: vi.fn().mockResolvedValue(preference),
      updateMany: vi.fn(),
      upsert: vi
        .fn()
        .mockImplementation(async ({ update }: { update: { catalogLanguage?: string } }) => ({
          voiceId: preference?.voiceId ?? "",
          isDefault: preference?.isDefault ?? false,
          speechModel: null,
          catalogLanguage: update.catalogLanguage ?? null,
        })),
    });
    const prisma = {
      user: { findUnique: vi.fn().mockResolvedValue({ locale }) },
      userVoiceCredential: { findFirst: vi.fn().mockResolvedValue(credential) },
      spaceSettingOverride: {
        findUnique: vi.fn().mockResolvedValue(overridden ? { setting: "voice" } : null),
      },
      userVoicePreference: table(),
      spaceVoicePreference: table(),
      $queryRaw: vi.fn().mockResolvedValue([{ locked: 1 }]),
      $transaction: vi.fn(),
    };
    prisma.$transaction.mockImplementation(async (callback: (tx: typeof prisma) => unknown) =>
      callback(prisma),
    );
    return {
      deps: { prisma, secrets: { put: vi.fn(), load: vi.fn() } } as unknown as VoiceDeps,
      account: prisma.userVoicePreference,
      prisma,
    };
  }

  it("remembers a language without changing the selected voice", async () => {
    const { deps, account } = languageDeps({ voiceId: "voice-1", isDefault: true });

    await expect(
      updateVoiceCatalogLanguage(deps, actor, { provider: "fish-audio", catalogLanguage: "de-DE" }),
    ).resolves.toMatchObject({
      provider: "fish-audio",
      voiceId: "voice-1",
      catalogLanguage: "de",
      isDefault: true,
    });
    expect(account.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ update: { catalogLanguage: "de" } }),
    );
    expect(account.updateMany).not.toHaveBeenCalled();
  });

  it("remembers every language as an empty choice", async () => {
    const { deps, account } = languageDeps({ voiceId: "voice-1", isDefault: false });

    await expect(
      updateVoiceCatalogLanguage(deps, actor, { provider: "fish-audio", catalogLanguage: " " }),
    ).resolves.toMatchObject({ catalogLanguage: "" });
    expect(account.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ update: { catalogLanguage: "" } }),
    );
  });

  it("rejects a language filter the provider does not offer", async () => {
    const { deps, account } = languageDeps(
      { voiceId: "voice-1", isDefault: true },
      { provider: "openai" },
    );

    await expect(
      updateVoiceCatalogLanguage(deps, actor, { provider: "openai", catalogLanguage: "de" }),
    ).rejects.toThrow("This voice provider has no language filter.");
    expect(account.upsert).not.toHaveBeenCalled();
  });

  it("uses the request, then the saved choice, then the account locale", async () => {
    const saved = languageDeps({ voiceId: "voice-1", isDefault: true });
    await expect(
      voiceListingLanguage(saved.deps, actor, { provider: "fish-audio", catalogLanguage: "de" }),
    ).resolves.toBe("de");
    expect(saved.prisma.user.findUnique).not.toHaveBeenCalled();

    const unset = languageDeps(null, { locale: "pt-BR" });
    await expect(
      voiceListingLanguage(unset.deps, actor, { provider: "fish-audio", catalogLanguage: null }),
    ).resolves.toBe("pt");
    await expect(
      voiceListingLanguage(
        unset.deps,
        actor,
        { provider: "fish-audio", catalogLanguage: null },
        "",
      ),
    ).resolves.toBeUndefined();
    await expect(
      voiceListingLanguage(unset.deps, actor, { provider: "openai", catalogLanguage: null }, "de"),
    ).resolves.toBeUndefined();
    expect(unset.prisma.user.findUnique).toHaveBeenCalledOnce();
  });
});
