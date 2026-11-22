import { describe, expect, it } from "vitest";
import {
  catalogLanguageCode,
  defaultVoiceCatalogLanguage,
  voiceCatalogLanguageChoices,
  voiceCatalogListingLanguage,
  voiceCatalogRequestLanguage,
} from "./voice-catalog-language.js";

describe("catalog language", () => {
  it("keeps the primary subtag of a language tag", () => {
    expect(catalogLanguageCode("de-DE")).toBe("de");
    expect(catalogLanguageCode(" PT-br ")).toBe("pt");
    expect(catalogLanguageCode("zh-Hant-TW")).toBe("zh");
    expect(catalogLanguageCode("")).toBeUndefined();
    expect(catalogLanguageCode("english")).toBeUndefined();
    expect(catalogLanguageCode("es_ES")).toBeUndefined();
  });

  it("defaults to the device language, then the app locale, then English", () => {
    expect(defaultVoiceCatalogLanguage("de-DE", "en")).toBe("de");
    expect(defaultVoiceCatalogLanguage("not-a-tag", "pt-BR")).toBe("pt");
    expect(defaultVoiceCatalogLanguage(undefined, undefined)).toBe("en");
  });

  it("lists every language only when that was asked for", () => {
    expect(
      voiceCatalogListingLanguage({
        requested: "",
        supportsLanguages: true,
        saved: "de",
        locale: "en",
      }),
    ).toBeUndefined();
    expect(
      voiceCatalogListingLanguage({
        requested: "de-DE",
        supportsLanguages: true,
      }),
    ).toBe("de");
    expect(
      voiceCatalogListingLanguage({
        supportsLanguages: true,
        saved: "",
        locale: "fr",
      }),
    ).toBeUndefined();
    expect(
      voiceCatalogListingLanguage({
        supportsLanguages: true,
        saved: null,
        locale: "pt-BR",
      }),
    ).toBe("pt");
    expect(
      voiceCatalogListingLanguage({
        requested: "de",
        supportsLanguages: false,
      }),
    ).toBeUndefined();
  });

  it("uses the remembered choice, including every language, before the locale", () => {
    expect(
      voiceCatalogRequestLanguage({
        supportsLanguages: true,
        saved: "de",
        locale: "en",
      }),
    ).toBe("de");
    expect(
      voiceCatalogRequestLanguage({
        supportsLanguages: true,
        saved: "",
        locale: "de-DE",
      }),
    ).toBe("");
    expect(
      voiceCatalogRequestLanguage({
        supportsLanguages: true,
        saved: null,
        locale: "sv-SE",
        fallbackLocale: "en",
      }),
    ).toBe("sv");
    expect(voiceCatalogRequestLanguage({ supportsLanguages: false, locale: "de" })).toBeUndefined();
  });

  it("offers the device language when the fixed list does not", () => {
    const choices = voiceCatalogLanguageChoices("sv", "sv-SE");
    expect(choices.find((choice) => choice.value === "de")?.label).toBe("Deutsch");
    expect(choices.filter((choice) => choice.value === "sv")).toEqual([
      { value: "sv", label: choices.find((choice) => choice.value === "sv")?.label },
    ]);
    expect(choices.find((choice) => choice.value === "sv")?.label).not.toBe("sv");
  });
});
