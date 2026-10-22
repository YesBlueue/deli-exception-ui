import Link from "next/link";
import { DataList, IconButton, Text } from "@radix-ui/themes";
import { ArrowLeft, X } from "lucide-react";
import type { ReactNode } from "react";

/** Label/value pairs for record details (shipment, order, submission). */
export function KeyValueList({ items }: { items: { label: ReactNode; value: ReactNode }[] }) {
  return (
    <DataList.Root size="2">
      {items.map((item, i) => (
        <DataList.Item key={i}>
          <DataList.Label minWidth="96px">{item.label}</DataList.Label>
          <DataList.Value className="min-w-0 break-words">{item.value}</DataList.Value>
        </DataList.Item>
      ))}
    </DataList.Root>
  );
}

/** Key facts of a record as a strip under the page header: small gray labels over values. */
export function FactGrid({ items }: { items: { label: ReactNode; value: ReactNode }[] }) {
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-3 border-y py-3 sm:grid-cols-3 lg:grid-cols-5">
      {items.map((item, i) => (
        <div key={i} className="min-w-0">
          <dt>
            <Text size="1" color="gray">
              {item.label}
            </Text>
          </dt>
          <dd>
            <Text as="div" size="2" weight="medium" className="break-words">
              {item.value}
            </Text>
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** Quiet link back to the parent page. */
export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="size-4" aria-hidden /> {children}
    </Link>
  );
}

/** Square photo preview; opens the full image, or shows a remove button when `onRemove` is set. */
export function PhotoThumb({
  src,
  alt,
  size = "md",
  onRemove,
}: {
  src: string;
  alt: string;
  size?: "md" | "lg";
  onRemove?: () => void;
}) {
  const box = size === "lg" ? "size-28" : "size-20";
  const img = <img src={src} alt={alt} className={`${box} rounded-md border object-cover`} />;
  if (!onRemove)
    return (
      <a href={src} target="_blank" rel="noreferrer">
        {img}
      </a>
    );
  return (
    <div className="relative">
      {img}
      <IconButton
        type="button"
        size="1"
        variant="solid"
        color="gray"
        radius="full"
        className="!absolute -right-2 -top-2 [&_svg]:size-3.5"
        aria-label={`Remove ${alt}`}
        onClick={onRemove}
      >
        <X />
      </IconButton>
    </div>
  );
}
