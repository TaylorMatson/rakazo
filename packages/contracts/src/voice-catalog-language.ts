const LANGUAGE_TAG = /^([A-Za-z]{2,3})(?:-[A-Za-z0-9]{2,8})*$/;

/**
 * Languages the voice catalog filter offers, named in that language. A provider that can filter
 * narrows its public catalog to the primary subtag; the device's language is added when it is
 * not already here.
 */
export const VOICE_CATALOG_LANGUAGES: readonly { code: string; label: string }[] = [
  { code: "en", label: "English" },
  { code: "de", label: "Deutsch" },
  { code: "ko", label: "한국어" },
  { code: "tr", label: "Türkçe" },
  { code: "hi", label: "हिन्दी" },
  { code: "pt", label: "Português" },
  { code: "zh", label: "中文" },
  { code: "es", label: "Español" },
  { code: "ru", label: "Русский" },
  { code: "fr", label: "Français" },
  { code: "he", label: "עברית" },
  { code: "nl", label: "Nederlands" },
  { code: "ja", label: "日本語" },
  { code: "pl", label: "Polski" },
];

/** Lowercase primary language subtag, or undefined when the value is not a language tag. */
export function catalogLanguageCode(value: string | null | undefined): string | undefined {
  const match = LANGUAGE_TAG.exec(value?.trim() ?? "");
  const code = match?.[1]?.toLowerCase();
  return code || undefined;
}

/**
 * The catalog language to use before a connection remembers one: the device or browser
 * language, then the app or deployment locale, then English.
 */
export function defaultVoiceCatalogLanguage(
  deviceTag: string | null | undefined,
  fallbackTag?: string | null,
): string {
  return catalogLanguageCode(deviceTag) ?? catalogLanguageCode(fallbackTag) ?? "en";
}

/**
 * Language a catalog listing should ask for. Undefined means no filter: the provider has none,
 * or the caller asked for every language. `saved` absent means nothing is remembered yet;
 * empty `saved` or `requested` means every language.
 */
export function voiceCatalogListingLanguage(input: {
  requested?: string;
  supportsLanguages: boolean;
  saved?: string | null;
  locale?: string | null;
}): string | undefined {
  if (!input.supportsLanguages) return undefined;
  const raw =
    input.requested !== undefined
      ? input.requested
      : input.saved != null
        ? input.saved
        : (input.locale ?? "");
  return catalogLanguageCode(raw);
}

/**
 * What the picker requests before the user changes it. Empty means every language.
 * Undefined means this provider has no language filter.
 */
export function voiceCatalogRequestLanguage(input: {
  supportsLanguages: boolean;
  saved?: string | null;
  locale?: string | null;
  fallbackLocale?: string | null;
}): string | undefined {
  if (!input.supportsLanguages) return undefined;
  if (input.saved != null) return catalogLanguageCode(input.saved) ?? "";
  return defaultVoiceCatalogLanguage(input.locale, input.fallbackLocale);
}

function languageLabel(code: string): string {
  const known = VOICE_CATALOG_LANGUAGES.find((entry) => entry.code === code);
  if (known) return known.label;
  try {
    const name = new Intl.DisplayNames([code], { type: "language" }).of(code);
    if (name && name.toLowerCase() !== code) return name;
  } catch {
    // An unknown code is shown as itself.
  }
  return code;
}

/** Language options for the picker, plus the device or saved language when it is not listed. */
export function voiceCatalogLanguageChoices(
  selected: string,
  deviceTag?: string | null,
): { value: string; label: string }[] {
  const extras: string[] = [];
  for (const tag of [deviceTag, selected]) {
    const code = catalogLanguageCode(tag);
    if (!code || extras.includes(code)) continue;
    if (VOICE_CATALOG_LANGUAGES.some((entry) => entry.code === code)) continue;
    extras.push(code);
  }
  return [
    ...VOICE_CATALOG_LANGUAGES.map((entry) => ({ value: entry.code, label: entry.label })),
    ...extras.map((code) => ({ value: code, label: languageLabel(code) })),
  ];
}
