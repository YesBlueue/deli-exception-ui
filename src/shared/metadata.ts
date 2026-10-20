import type { Metadata } from "next";

interface PageMetadataInput {
  title: string;
  description: string;
  /** Defaults to `title`. */
  ogTitle?: string;
  /** Defaults to `description`. */
  ogDescription?: string;
  noIndex?: boolean;
}

/** Shared page metadata shape: title, description, Open Graph website card and a summary Twitter card. */
export function pageMetadata({ title, description, ogTitle = title, ogDescription = description, noIndex = false }: PageMetadataInput): Metadata {
  return {
    title,
    description,
    openGraph: { title: ogTitle, description: ogDescription, type: "website" },
    twitter: { card: "summary" },
    ...(noIndex && { robots: { index: false } }),
  };
}
