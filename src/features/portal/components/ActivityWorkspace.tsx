"use client";
import Link from "next/link";
import { Text } from "@radix-ui/themes";
import { History } from "lucide-react";
import { useState } from "react";
import { usePortal } from "@/infrastructure/portal/use-portal";
import { Button } from "@/shared/ui/button";
import {
  BackLink,
  EmptyState,
  FilterBar,
  OptionSelect,
  PageHeader,
  Panel as PatternPanel,
  SearchField,
  Timeline,
} from "@/shared/ui/patterns";
import { Panel, PortalState, friendly, time } from "./shared";
/** Entries shown before "Show more"; the full audit log can be long. */
const PAGE = 50;
/** Every recorded action from the audit log, newest first, with search and type filters. */
export function ActivityWorkspace() {
  const q = usePortal();
  const s = q.data;
  const [query, setQuery] = useState("");
  const [action, setAction] = useState("");
  const [actor, setActor] = useState("");
  const [shown, setShown] = useState(PAGE);
  if (!s)
    return <PortalState loading={q.isPending} error={q.error} retry={() => void q.refetch()} />;
  if (!s.isStaff)
    return (
      <Panel title="Operations access required">
        <Text as="p" size="2" color="gray">
          Your account has no active operations membership. An administrator must assign it on the
          backend.
        </Text>
      </Panel>
    );
  const distinct = (values: string[]) => [...new Set(values)].sort();
  const staffName = (id: string | null) => s.staff.find((v) => v.user_id === id)?.full_name;
  const entries = [...s.audit]
    .filter(
      (a) =>
        (!action || a.action_type === action) &&
        (!actor || a.actor_type === actor) &&
        a.description.toLowerCase().includes(query.toLowerCase()),
    )
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  // Changing a filter starts again from the first page.
  const filter = (set: (value: string) => void) => (value: string) => {
    set(value);
    setShown(PAGE);
  };
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <BackLink href="/overview">Operations overview</BackLink>
      <PageHeader
        title="All activity"
        description="Every recorded staff, system, customer and driver action, newest first."
      />
      <PatternPanel
        flush
        toolbar={
          <FilterBar
            search={
              <SearchField
                label="Search activity"
                placeholder="Search activity"
                value={query}
                onChange={filter(setQuery)}
              />
            }
          >
            <OptionSelect
              label="Action"
              value={action}
              onValueChange={filter(setAction)}
              emptyLabel="All actions"
              options={distinct(s.audit.map((a) => a.action_type)).map((v) => ({
                value: v,
                label: friendly(v),
              }))}
            />
            <OptionSelect
              label="Actor"
              value={actor}
              onValueChange={filter(setActor)}
              emptyLabel="All actors"
              options={distinct(s.audit.map((a) => a.actor_type)).map((v) => ({
                value: v,
                label: friendly(v),
              }))}
            />
          </FilterBar>
        }
      >
        {!entries.length ? (
          <EmptyState icon={History} title="No activity matches these filters." />
        ) : (
          <>
            <Timeline
              items={entries.slice(0, shown).map((a) => ({
                key: a.id,
                body: <span className="whitespace-pre-wrap break-words">{a.description}</span>,
                time: <time dateTime={a.created_at}>{time(a.created_at)}</time>,
                meta: (
                  <>
                    <span>· {friendly(a.action_type)}</span>
                    <span>· {staffName(a.actor_user_id) ?? friendly(a.actor_type)}</span>
                    {a.delivery_exception_id && (
                      <Link
                        href={`/exceptions/${a.delivery_exception_id}`}
                        className="text-primary hover:underline"
                      >
                        Open exception
                      </Link>
                    )}
                  </>
                ),
              }))}
            />
            <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3">
              <Text size="1" color="gray">
                Showing {Math.min(shown, entries.length)} of {entries.length}
              </Text>
              {shown < entries.length && (
                <Button size="sm" variant="outline" onClick={() => setShown(shown + PAGE)}>
                  Show more
                </Button>
              )}
            </div>
          </>
        )}
      </PatternPanel>
    </div>
  );
}
