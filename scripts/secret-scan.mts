// Pure helpers for scripts/check-secrets.mts. Nothing here ever prints a value.

export type ScanFile = { path: string; content: string };

/** Parses dotenv-style text: KEY=VALUE, optional `export`, optional quotes. */
export function parseEnv(text: string): Record<string, string> {
  const env: Record<string, string> = {};
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const match = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    let value = match[2].trim();
    if (/^(["']).*\1$/.test(value)) value = value.slice(1, -1);
    env[match[1]] = value;
  }
  return env;
}

/** Values long enough to be credentials; short ones (ports, flags) would only cause noise. */
export function secretValues(env: Record<string, string>, minLength = 12): string[] {
  return Object.values(env).filter((v) => v.length >= minLength);
}

/** Paths of files that contain any of the secret values. */
export function findLeaks(secrets: string[], files: ScanFile[]): string[] {
  return files.filter((f) => secrets.some((s) => f.content.includes(s))).map((f) => f.path);
}

/** NEXT_PUBLIC_ variables get baked into browser code; a secret-sounding one is a red flag. */
export function riskyPublicNames(env: Record<string, string>): string[] {
  return Object.keys(env).filter(
    (name) => name.startsWith("NEXT_PUBLIC_") && /TOKEN|SECRET|KEY|PASSWORD|PRIVATE/i.test(name),
  );
}
