type ServerEnvironmentKey =
  | "NEXT_PUBLIC_SUPABASE_URL"
  | "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  | "SUPABASE_SERVICE_ROLE_KEY"
  | "OPENAI_API_KEY"
  | "NEXT_PUBLIC_SITE_URL";

type RequiredEnvironment<K extends ServerEnvironmentKey> = {
  [Name in K]: string;
};

export class MissingServerEnvironmentError extends Error {
  constructor(readonly missing: ServerEnvironmentKey[]) {
    super(
      `Missing required environment variable(s): ${missing.join(", ")}. Set them in .env.local or the deployment environment.`,
    );
    this.name = "MissingServerEnvironmentError";
  }
}

export function requireServerEnv<const Keys extends readonly ServerEnvironmentKey[]>(
  ...keys: Keys
): RequiredEnvironment<Keys[number]> {
  const values: Partial<Record<ServerEnvironmentKey, string>> = {};
  const missing: ServerEnvironmentKey[] = [];

  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) values[key] = value;
    else missing.push(key);
  }

  if (missing.length) throw new MissingServerEnvironmentError(missing);
  return values as RequiredEnvironment<Keys[number]>;
}
