type PublicEnvironmentKey =
  | "NEXT_PUBLIC_SUPABASE_URL"
  | "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  | "NEXT_PUBLIC_SITE_URL";

type RequiredPublicEnvironment<K extends PublicEnvironmentKey> = {
  [Name in K]: string;
};

export class MissingPublicEnvironmentError extends Error {
  constructor(readonly missing: PublicEnvironmentKey[]) {
    super(`Missing required public environment variable(s): ${missing.join(", ")}.`);
    this.name = "MissingPublicEnvironmentError";
  }
}

function readPublicEnv(key: PublicEnvironmentKey) {
  switch (key) {
    case "NEXT_PUBLIC_SUPABASE_URL":
      return process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    case "NEXT_PUBLIC_SUPABASE_ANON_KEY":
      return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
    case "NEXT_PUBLIC_SITE_URL":
      return process.env.NEXT_PUBLIC_SITE_URL?.trim();
  }
}

export function requirePublicEnv<const Keys extends readonly PublicEnvironmentKey[]>(
  ...keys: Keys
): RequiredPublicEnvironment<Keys[number]> {
  const values: Partial<Record<PublicEnvironmentKey, string>> = {};
  const missing: PublicEnvironmentKey[] = [];

  for (const key of keys) {
    const value = readPublicEnv(key);
    if (value) values[key] = value;
    else missing.push(key);
  }

  if (missing.length) throw new MissingPublicEnvironmentError(missing);
  return values as RequiredPublicEnvironment<Keys[number]>;
}
