export function isLocalStudioDemoAllowed(
  nodeEnvironment: string | undefined,
  demoFlag: string | undefined,
): boolean {
  return nodeEnvironment === "development" && demoFlag === "true";
}

export function isStudioSupabaseStorageEnabled(storageMode: string | undefined): boolean {
  return storageMode === "supabase";
}
