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

const COLOUR_SWATCHES = [
  { label: "Text primary", use: "Headings, numbers", hex: "#151515", ratio: "16.6:1", className: "bg-text-primary" },
  { label: "Text secondary", use: "Supporting copy", hex: "#4A4A47", ratio: "8.1:1", className: "bg-text-secondary" },
  { label: "Text tertiary", use: "Labels, metadata", hex: "#5F5F5B", ratio: "5.8:1", className: "bg-text-tertiary" },
  { label: "Copper", use: "Actions, selection, focus", hex: "#8A5A2B", ratio: "5.3:1", className: "bg-accent-interactive" },
  { label: "Copper tint", use: "Selected backgrounds", hex: "#EFE6DC", ratio: "copper on it 4.8:1", className: "bg-accent-subtle" },
  { label: "Red", use: "Drops and risks only", hex: "#B42318", ratio: "6.0:1", className: "bg-error" },
  { label: "Ochre", use: "Warnings", hex: "#8A5A00", ratio: "5.4:1", className: "bg-warning" },
  { label: "Page", use: "Canvas", hex: "#F4F4F2", ratio: "—", className: "bg-background" },
];

const CHART_SWATCHES = ["#8A5A2B", "#3D3D3B", "#B0603F", "#93650F", "#7A7873", "#A3804F"];

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
        title="Colour: graphite and copper"
        description="Neutral graphite carries the data; copper marks what you can act on. Red is reserved for drops. No green, blue or purple: an increase is shown in ink with an ↑ arrow. Ratios are against the page background; every text colour meets WCAG AA (4.5:1)."
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {COLOUR_SWATCHES.map((swatch) => (
            <div key={swatch.label} className="overflow-hidden rounded-lg border border-border bg-surface">
              <div className={`h-14 ${swatch.className}`} />
              <div className="space-y-0.5 p-3">
                <p className="type-label text-text-primary">{swatch.label}</p>
                <p className="type-small">{swatch.use}</p>
                <p className="type-small tabular-nums text-text-tertiary">
                  {swatch.hex} · {swatch.ratio}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="Chart palette"
        description="Six warm and neutral colours, all at least 3:1 against white for graphics. Platform bars share one neutral; the bar you hover turns copper."
      >
        <div className="flex flex-wrap gap-3">
          {CHART_SWATCHES.map((hex) => (
            <div key={hex} className="flex items-center gap-2">
              <span className="h-6 w-6 rounded-sm" style={{ backgroundColor: hex }} aria-hidden />
              <span className="type-small tabular-nums">{hex}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="Motion"
        description="New answers fade and rise 6px in 200 ms; the chat panel slides in over 280 ms; buttons press to 98%. All of it turns off when the system asks for reduced motion."
      >
        <div className="motion-safe:animate-enter rounded-lg border border-border bg-surface p-4">
          <p className="type-body">Example answer card entering.</p>
        </div>
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
