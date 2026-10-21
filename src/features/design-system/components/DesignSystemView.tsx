"use client";

import { Badge, Code, Heading, SegmentedControl, Text } from "@radix-ui/themes";
import { ArrowRight, Inbox, Send } from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { PriorityBadge, SimBadge, StatusBadge } from "@/features/exceptions/components/badges";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import {
  BackLink,
  ButtonRow,
  DataTable,
  EmptyState,
  Field,
  FilterBar,
  KeyValueList,
  LinkList,
  Notice,
  PageHeader,
  Panel,
  SearchField,
  StatGrid,
  StatList,
  StatTile,
  Timeline,
  type Column,
} from "@/shared/ui/patterns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Switch } from "@/shared/ui/switch";
import { Textarea } from "@/shared/ui/textarea";

/** Living reference for the design system: tokens, components and page patterns as they render. */
export function DesignSystemView() {
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        eyebrow="Development only"
        title="Design system"
        description="Radix Themes with the brand palette. Build pages from these pieces; theme values live in src/shared/theme.ts and src/styles/globals.css."
      />
      <ColorRule />
      <Tokens />
      <Typography />
      <Buttons />
      <Forms />
      <Feedback />
      <Patterns />
    </div>
  );
}

function Rule({ children }: { children: ReactNode }) {
  return <Text as="p" size="2" color="gray" mb="4">{children}</Text>;
}

function Swatch({ name, token, note }: { name: string; token: string; note?: string }) {
  return (
    <div className="min-w-0">
      <div className="h-12 rounded-md border" style={{ background: `var(${token})` }} />
      <Text as="p" size="2" weight="medium" mt="2">{name}</Text>
      <Code size="1" variant="ghost" color="gray">{token}</Code>
      {note && <Text as="p" size="1" color="gray">{note}</Text>}
    </div>
  );
}

function ColorRule() {
  return (
    <Panel title="Color rule: 60-30-10">
      <Rule>Most of the screen is neutral so data stays readable; navy gives structure; orange appears only on the one main action of a screen.</Rule>
      <div className="grid h-10 grid-cols-10 overflow-hidden rounded-md border">
        <div className="col-span-6 flex items-center bg-background px-3"><Text size="1" weight="medium">60% neutral surfaces</Text></div>
        <div className="col-span-3 flex items-center bg-primary px-3"><Text size="1" weight="medium" className="text-primary-foreground">30% navy</Text></div>
        <div className="col-span-1 flex items-center bg-cta px-2"><Text size="1" weight="medium" className="text-cta-foreground">10%</Text></div>
      </div>
      <ul className="mt-4 grid gap-2 text-sm md:grid-cols-3">
        <li><Text weight="medium">Neutral</Text> — page and card backgrounds, borders, body text, secondary buttons.</li>
        <li><Text weight="medium">Navy</Text> — links, focus, selected and active states, key figures, the logo.</li>
        <li><Text weight="medium">Orange</Text> — the default button only. Never for selection, status or decoration.</li>
      </ul>
    </Panel>
  );
}

function Tokens() {
  return (
    <Panel title="Color tokens">
      <Rule>Use these through Tailwind classes (bg-card, text-muted-foreground, text-critical…). Never use raw hex values or Tailwind palette colors like text-red-500.</Rule>
      <Heading as="h3" size="2" mb="3">Surfaces and brand</Heading>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 2xl:grid-cols-8">
        <Swatch name="Background" token="--background" />
        <Swatch name="Card" token="--card" />
        <Swatch name="Muted" token="--muted" />
        <Swatch name="Border" token="--border" />
        <Swatch name="Foreground" token="--foreground" />
        <Swatch name="Muted text" token="--muted-foreground" />
        <Swatch name="Primary" token="--primary" note="Brand navy" />
        <Swatch name="Call to action" token="--cta" note="Brand orange" />
      </div>
      <Heading as="h3" size="2" mt="5" mb="3">Status — fixed meanings</Heading>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 2xl:grid-cols-7">
        <Swatch name="Critical" token="--critical" note="Red" />
        <Swatch name="High" token="--high" note="Crimson" />
        <Swatch name="Medium" token="--medium" note="Yellow" />
        <Swatch name="Low" token="--low" note="Gray" />
        <Swatch name="Success" token="--success" note="Green" />
        <Swatch name="Info" token="--info" note="Blue" />
        <Swatch name="Simulated" token="--demo" note="Purple" />
      </div>
    </Panel>
  );
}

function Typography() {
  return (
    <Panel title="Typography">
      <Rule>IBM Plex Sans and Plex Mono. Use Radix Heading and Text sizes, not Tailwind text sizes, so type scales with the theme.</Rule>
      <div className="space-y-3">
        <div className="flex items-baseline gap-4"><Code size="1" color="gray">Heading 7</Code><Heading size="7">Page title</Heading></div>
        <div className="flex items-baseline gap-4"><Code size="1" color="gray">Heading 5</Code><Heading size="5">Dialog title</Heading></div>
        <div className="flex items-baseline gap-4"><Code size="1" color="gray">Heading 4</Code><Heading size="4">Page section</Heading></div>
        <div className="flex items-baseline gap-4"><Code size="1" color="gray">Heading 3</Code><Heading size="3">Panel title</Heading></div>
        <div className="flex items-baseline gap-4"><Code size="1" color="gray">Text 2</Code><Text size="2">Body text for descriptions and table cells.</Text></div>
        <div className="flex items-baseline gap-4"><Code size="1" color="gray">Text 1 gray</Code><Text size="1" color="gray">Timestamps, hints and metadata.</Text></div>
        <div className="flex items-baseline gap-4"><Code size="1" color="gray">Mono</Code><Text size="2" className="font-mono">ORD-24081 · GSX7732014MM</Text></div>
      </div>
    </Panel>
  );
}

function Buttons() {
  return (
    <Panel title="Buttons">
      <Rule>One default (orange) button per screen or dialog, for the main action. Everything else is secondary, outline or ghost.</Rule>
      <div className="flex flex-wrap items-center gap-2">
        <Button><Send />Default — main action</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="destructive">Destructive</Button>
        <Button variant="link">Link</Button>
        <Button disabled>Disabled</Button>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline">Small</Button>
        <Button variant="outline">Default size</Button>
        <Button size="lg" variant="outline">Large<ArrowRight /></Button>
        <Button size="icon" variant="ghost" aria-label="Icon button"><Inbox /></Button>
      </div>
    </Panel>
  );
}

function Forms() {
  const [tone, setTone] = useState("Empathetic");
  return (
    <Panel title="Forms">
      <Rule>Wrap every control in Field for its label, hint and error. Use a segmented control for picking one of a few options.</Rule>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Text input" htmlFor="ds-input" hint="Hints sit below the control."><Input id="ds-input" placeholder="Placeholder" /></Field>
        <Field label="Select" htmlFor="ds-select">
          <Select defaultValue="a">
            <SelectTrigger id="ds-select"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="a">Option A</SelectItem><SelectItem value="b">Option B</SelectItem></SelectContent>
          </Select>
        </Field>
        <Field label="Textarea" htmlFor="ds-textarea" error="Errors replace nothing; they appear under the control." errorId="ds-textarea-err">
          <Textarea id="ds-textarea" rows={2} aria-describedby="ds-textarea-err" />
        </Field>
        <div className="space-y-4">
          <Field label="Segmented control">
            <SegmentedControl.Root value={tone} onValueChange={setTone} aria-label="Example choice">
              {["Empathetic", "Professional", "Direct"].map((t) => <SegmentedControl.Item key={t} value={t}>{t}</SegmentedControl.Item>)}
            </SegmentedControl.Root>
          </Field>
          <Text as="label" size="2" className="flex items-center gap-2"><Switch defaultChecked />Switch</Text>
        </div>
      </div>
    </Panel>
  );
}

function Feedback() {
  return (
    <Panel title="Feedback and status">
      <Rule>Notices for messages in a page or form (role alert for errors, status for confirmations). Toasts for brief confirmation of an action. Badges for record state.</Rule>
      <div className="grid gap-3 md:grid-cols-2">
        <Notice tone="error" title="Error">Something failed and needs attention.</Notice>
        <Notice tone="warning" title="Warning">Data is missing or needs a check.</Notice>
        <Notice tone="info" title="Info">Neutral guidance or an update.</Notice>
        <Notice tone="success" title="Success">The action completed.</Notice>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <PriorityBadge p="CRITICAL" /><PriorityBadge p="HIGH" /><PriorityBadge p="MEDIUM" /><PriorityBadge p="LOW" />
        <StatusBadge s="NEW" /><StatusBadge s="AWAITING_CARRIER" /><StatusBadge s="RESOLVED" />
        <SimBadge /><Badge color="gray" variant="soft">Gray badge</Badge>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => toast.success("Saved", { description: "Success toast" })}>Success toast</Button>
        <Button size="sm" variant="outline" onClick={() => toast.error("Could not save")}>Error toast</Button>
        <Button size="sm" variant="outline" onClick={() => toast.warning("Check the details")}>Warning toast</Button>
        <Button size="sm" variant="outline" onClick={() => toast.info("For your information")}>Info toast</Button>
      </div>
    </Panel>
  );
}

type SampleRow = { id: string; order: string; customer: string; state: string };
const SAMPLE_ROWS: SampleRow[] = [
  { id: "1", order: "ORD-10001", customer: "Example Customer", state: "Open" },
  { id: "2", order: "ORD-10002", customer: "Second Customer", state: "Resolved" },
];
const SAMPLE_COLUMNS: Column<SampleRow>[] = [
  { header: "Order", cell: (r) => r.order, className: "font-mono text-xs" },
  { header: "Customer", cell: (r) => r.customer },
  { header: "State", cell: (r) => r.state, className: "text-muted-foreground" },
];

function Patterns() {
  const [selected, setSelected] = useState("1");
  return (
    <div className="space-y-6">
      <Heading as="h2" size="5">Page patterns</Heading>
      <Rule>Every page is PageHeader, then optional StatGrid, then Panels. Do not hand-write cards, headers or tables.</Rule>
      <BackLink href="/design-system">BackLink</BackLink>
      <PageHeader eyebrow="Eyebrow context" title="PageHeader" description="Title, description and actions." actions={<Button variant="outline">Action</Button>} />
      <StatGrid label="Example stats">
        <StatTile label="Neutral" value={12} />
        <StatTile label="Accent" value={8} tone="accent" />
        <StatTile label="Critical" value={2} tone="critical" />
        <StatTile label="Loading" value={null} />
      </StatGrid>
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Panel with toolbar + DataTable" flush toolbar={<FilterBar search={<SearchField label="Search example" value="" onChange={() => {}} placeholder="SearchField" />}><Select defaultValue="all"><SelectTrigger aria-label="Example filter" className="xl:w-36"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem></SelectContent></Select></FilterBar>}>
          <DataTable label="Example table" columns={SAMPLE_COLUMNS} rows={SAMPLE_ROWS} rowKey={(r) => r.id} renderMobile={(r) => <Text size="2">{r.order} · {r.customer}</Text>} />
        </Panel>
        <Panel title="EmptyState">
          <EmptyState icon={Inbox} title="Nothing here yet" description="Explain why and what to do next." action={<Button size="sm" variant="outline">Reset filters</Button>} />
        </Panel>
        <Panel title="ButtonRow list" flush>
          <LinkList label="Example rows">
            {SAMPLE_ROWS.map((r) => <ButtonRow key={r.id} selected={selected === r.id} onClick={() => setSelected(r.id)}><Text size="2" weight="medium">{r.order}</Text> <Text size="1" color="gray">{r.customer}</Text></ButtonRow>)}
          </LinkList>
        </Panel>
        <Panel title="KeyValueList">
          <KeyValueList items={[{ label: "Tracking", value: <span className="font-mono text-xs">GSX0000000</span> }, { label: "Carrier", value: "Example Express" }, { label: "Order value", value: "120,000 MMK" }]} />
        </Panel>
        <Panel title="StatList" flush>
          <StatList items={[{ key: "a", label: "Carrier A", value: 3 }, { key: "b", label: "Carrier B", value: 1 }]} />
        </Panel>
        <Panel title="Timeline" flush>
          <Timeline items={[{ key: "1", body: "Status changed to In progress", time: "Oct 21, 09:30", meta: <>· <span>Staff member</span></> }, { key: "2", body: "Opened from carrier event", time: "Oct 20, 14:02" }]} />
        </Panel>
      </div>
    </div>
  );
}
