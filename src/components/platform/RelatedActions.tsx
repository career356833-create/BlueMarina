import Link from "next/link";

export function RelatedActions({ title = "이어서 살펴보기", items }: {
  title?: string;
  items: readonly { href: string; label: string }[];
}) {
  return <nav aria-label={title} className="bm-surface-dark my-6 min-w-0 rounded-2xl p-5">
    <h2 className="text-base font-bold">{title}</h2>
    <div className="mt-3 flex flex-wrap gap-3">
      {items.map(({ href, label }) => <Link key={href} href={href}
        className="bm-action-secondary inline-flex min-h-11 max-w-full items-center break-words px-4 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--bm-brand-accent)]">{label}</Link>)}
    </div>
  </nav>;
}
