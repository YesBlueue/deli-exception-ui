/**
 * Page layout patterns built on Radix Themes. Pages compose these instead of hand-writing cards,
 * headers and tables, so every screen shares one structure. Responsive layout uses Tailwind
 * breakpoints (sm 640, lg 1024, xl 1280); Radix supplies components and typography.
 */
export { PageHeader } from "./page-header";
export { BreakdownGrid, BreakdownTile, StatGrid, StatTile, type StatTone } from "./stat";
export { Panel } from "./panel";
export { SectionTabs } from "./section-tabs";
export { DataTable, type Column } from "./data-table";
export { FilterBar, SearchField } from "./filter-bar";
export { EmptyState } from "./empty-state";
export { ButtonRow, LinkList, LinkRow, MetaLine, RecordSummary, StatList, Timeline } from "./lists";
export { Field, Notice } from "./form";
export { OptionSelect, type Option } from "./option-select";
export { BackLink, FactGrid, KeyValueList, PhotoThumb } from "./details";
export { BrandMark, PRODUCT_NAME, ProductMark, SiteShell } from "./site-shell";
