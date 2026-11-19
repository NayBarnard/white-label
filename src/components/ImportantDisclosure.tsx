export function ImportantDisclosure({ text }: { text: string }) {
  if (!text.trim()) return null;

  return (
    <aside className="mt-5 rounded-xl border border-[var(--accent)]/50 bg-[var(--surface)] p-5" aria-labelledby="important-disclosure-heading">
      <h3 id="important-disclosure-heading" className="text-sm font-bold text-[var(--accent)]">
        Important disclosure
      </h3>
      <p className="mt-2 text-sm leading-6 text-[var(--foreground)]">{text}</p>
    </aside>
  );
}
