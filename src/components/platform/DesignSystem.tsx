import type { ReactNode } from "react";

export function PageHero({ eyebrow, title, description, children }: {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <section className="bm-page-hero p-6 sm:p-8 lg:p-10">
      <p className="bm-eyebrow">{eyebrow}</p>
      <h1 className="mt-4 text-3xl leading-tight sm:text-4xl lg:text-5xl">{title}</h1>
      <p className="bm-lede mt-4 max-w-3xl text-sm sm:text-base">{description}</p>
      {children}
    </section>
  );
}

export function SectionHeading({ eyebrow, title, description }: {
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-5">
      {eyebrow ? <p className="bm-eyebrow">{eyebrow}</p> : null}
      <h2 className="bm-section-title mt-1 text-2xl sm:text-3xl">{title}</h2>
      {description ? <p className="mt-2 text-sm leading-6 text-[var(--bm-ink-muted)]">{description}</p> : null}
    </div>
  );
}

export function EmptyState({ icon, title, description, children }: {
  icon?: ReactNode;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <section className="bm-empty-state px-6 py-10 text-center sm:px-10 sm:py-12">
      {icon ? <div className="mx-auto flex w-fit text-marine-accent">{icon}</div> : null}
      <h2 className="mt-4 font-serif text-2xl font-normal text-marine-foreground">{title}</h2>
      <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-marine-secondary">{description}</p>
      {children}
    </section>
  );
}
