import { cn } from "@/lib/cn";

interface AuthHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  className?: string;
}

export function AuthHeader({
  eyebrow,
  title,
  description,
  className,
}: AuthHeaderProps) {
  return (
    <header className={cn("mb-8 space-y-2", className)}>
      {eyebrow ? (
        <p className="type-label uppercase tracking-wide text-text-tertiary">
          {eyebrow}
        </p>
      ) : null}
      <h1 className="type-h1">{title}</h1>
      {description ? (
        <p className="type-body text-text-secondary">{description}</p>
      ) : null}
    </header>
  );
}
