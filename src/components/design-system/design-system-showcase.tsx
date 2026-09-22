"use client";

import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
  Label,
} from "@/components/ui";

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="type-h2">{title}</h2>
        {description ? (
          <p className="mt-1 type-small text-text-tertiary">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export function DesignSystemShowcase() {
  return (
    <div className="grid gap-12 pb-16">
      <Section title="Typography" description="Hierarchy through size and weight.">
        <Card>
          <CardContent className="space-y-4 pt-5">
            <p className="type-display">Display — 32/40</p>
            <p className="type-h1">Heading 1 — 24/32</p>
            <p className="type-h2">Heading 2 — 20/28</p>
            <p className="type-h3">Heading 3 — 16/24</p>
            <p className="type-body">Body — 14/20 regular</p>
            <p className="type-body-medium">Body medium — 14/20 medium</p>
            <p className="type-small">Small — 12/16</p>
            <p className="type-label">Label — 12/16 medium</p>
            <p className="type-metric">$128,430.00</p>
          </CardContent>
        </Card>
      </Section>

      <Section title="Buttons">
        <Card>
          <CardContent className="flex flex-wrap gap-3 pt-5">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="tertiary">Tertiary</Button>
            <Button variant="destructive">Destructive</Button>
            <Button size="compact">Compact</Button>
            <Button disabled>Disabled</Button>
          </CardContent>
        </Card>
      </Section>

      <Section title="Inputs">
        <Card className="max-w-md">
          <CardContent className="space-y-4 pt-5">
            <div className="space-y-2">
              <Label htmlFor="workspace">Workspace</Label>
              <Input id="workspace" placeholder="Acme Commerce" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invalid">Validation</Label>
              <Input
                id="invalid"
                aria-invalid="true"
                defaultValue="Invalid value"
              />
              <p className="type-small text-error">Enter a valid identifier.</p>
            </div>
          </CardContent>
        </Card>
      </Section>

      <Section title="Badges">
        <Card>
          <CardContent className="flex flex-wrap gap-2 pt-5">
            <Badge>Default</Badge>
            <Badge variant="outline">Outline</Badge>
            <Badge variant="dark">Dark</Badge>
            <Badge variant="success">Success</Badge>
            <Badge variant="warning">Warning</Badge>
            <Badge variant="error">Error</Badge>
            <Badge variant="info">Info</Badge>
          </CardContent>
        </Card>
      </Section>

      <Section title="Card">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Metric container</CardTitle>
            <CardDescription>
              White surface, subtle border, 12px radius.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="type-metric">94.2%</p>
            <p className="mt-1 type-small">Conversion rate · last 7 days</p>
          </CardContent>
          <CardFooter>
            <Button variant="secondary" size="sm">
              View detail
            </Button>
          </CardFooter>
        </Card>
      </Section>

      <Section title="Dropdown">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary">
              Options
              <ChevronDown className="h-4 w-4 text-text-tertiary" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Export CSV</DropdownMenuItem>
            <DropdownMenuItem>Schedule report</DropdownMenuItem>
            <DropdownMenuItem disabled>Archive (disabled)</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </Section>

      <Section title="Dialog">
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="secondary">Open dialog</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm export</DialogTitle>
              <DialogDescription>
                This will generate a CSV from the current filter context. Large
                exports may take a few minutes.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="secondary">Cancel</Button>
              <Button>Export</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Section>

      <Section
        title="Surfaces & borders"
        description="Neutral palette for layout and chrome."
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Background", className: "bg-background" },
            { label: "Secondary", className: "bg-background-secondary" },
            { label: "Tertiary", className: "bg-background-tertiary" },
            { label: "Surface hover", className: "bg-surface-hover" },
          ].map((swatch) => (
            <div
              key={swatch.label}
              className={`rounded-lg border border-border p-4 ${swatch.className}`}
            >
              <p className="type-label">{swatch.label}</p>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
