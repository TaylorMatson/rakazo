import type { SettingsScope, VoiceCredential } from "@rakazo/contracts";
import type { rpc } from "./api";

type VoiceRpc = typeof rpc;

/** Saves the catalog language on the voice connection the screen is editing. */
export function saveVoiceCatalogLanguage(
  send: VoiceRpc,
  input: { provider: string; scope: SettingsScope; catalogLanguage: string },
): Promise<VoiceCredential> {
  return send("voice/setCatalogLanguage", input);
}
