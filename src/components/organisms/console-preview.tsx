import { Badge } from "@/components/atoms/badge";
import {
  CheckIcon,
  ChevronDownIcon,
  ClockIcon,
  FileTextIcon,
  SearchIcon,
} from "@/components/atoms/icons";
import { SegmentedBar } from "@/components/atoms/segmented-bar";
import { MapPaper, type MapPaperPin } from "@/components/molecules/map-paper";
import { Panel } from "@/components/molecules/panel";
import { PanelExpand, StatChip } from "@/components/molecules/panel-chrome";
import { ProgressCurve } from "@/components/molecules/progress-curve";
import { consolePreview as preview } from "@/lib/marketing";

const CHIP_ICONS = {
  clock: ClockIcon,
  file: FileTextIcon,
  check: CheckIcon,
} as const;

/** The table's columns, shared by its header and its rows so they line up. */
const TABLE_ROW =
  "grid grid-cols-[minmax(0,1fr)_5.5rem_6.5rem] gap-x-3 border-b border-border px-5 sm:px-6";

const PINS: readonly MapPaperPin[] = [
  { x: 14, y: 30 },
  { x: 28, y: 72 },
  { x: 47, y: 22 },
  { x: 62, y: 58, active: true },
  { x: 78, y: 28 },
  { x: 86, y: 74 },
  { x: 39, y: 50 },
];

/**
 * The hero's still of the practice board: the rail, the map, the table — the
 * same panels the console draws, filled with sample data. Decorative: the
 * whole frame is `aria-hidden`, the hero's copy says what it shows.
 */
export function ConsolePreview() {
  return (
    <div
      aria-hidden="true"
      inert
      className="rounded-[1.6rem] border border-border-strong bg-background/80 p-2 shadow-[var(--shadow-pop)] sm:p-2.5"
    >
      <div className="flex items-center justify-between px-3 pt-1.5 pb-3">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-muted/40" />
          <span className="size-2.5 rounded-full bg-muted/30" />
          <span className="size-2.5 rounded-full bg-muted/20" />
        </span>
        <span className="rounded-full bg-surface px-3 py-1 text-2xs text-muted">
          {preview.caption}
        </span>
        <span className="grid size-5 place-items-center rounded-[0.35rem] border-[1.5px] border-primary text-[0.625rem] font-bold text-primary">
          K
        </span>
      </div>

      <div className="grid gap-2 sm:grid-cols-[15.5rem_minmax(0,1fr)] sm:gap-2.5">
        <Panel
          title={preview.rail.title}
          action={<PanelExpand />}
          className="hidden sm:block"
        >
          <div className="grid gap-1.5">
            {preview.rail.chips.map((chip) => {
              const Icon = CHIP_ICONS[chip.icon];
              return (
                <StatChip
                  key={chip.label}
                  icon={<Icon className="size-3.5" />}
                  label={chip.label}
                  value={chip.value}
                />
              );
            })}
          </div>
          <ProgressCurve
            percent={preview.rail.percent}
            caption={preview.rail.caption}
            bleed="-mx-5 sm:-mx-6"
            className="mt-2"
          />
          <ul className="mt-4 space-y-2.5 border-t border-border pt-4">
            {preview.rail.specialties.map((row) => (
              <li key={row.label} className="flex items-center gap-2">
                <span className="w-[5.5rem] shrink-0 truncate text-2xs text-foreground">
                  {row.label}
                </span>
                <span className="w-4 shrink-0 text-right text-2xs font-medium text-foreground tabular-nums">
                  {row.count}
                </span>
                <SegmentedBar percent={row.percent} className="h-2.5" />
              </li>
            ))}
          </ul>
        </Panel>

        <div className="flex min-w-0 flex-col gap-2 sm:gap-2.5">
          <MapPaper pins={PINS} className="h-40 sm:h-44">
            <span className="absolute top-3 left-3 flex items-center gap-2 rounded-full bg-map-card px-3 py-1.5 text-2xs font-medium text-map-ink shadow-[0_2px_10px_rgb(22_21_15/0.18)]">
              <SearchIcon className="size-3.5" />
              {preview.map.search}
            </span>
            <span className="absolute top-3 right-3 hidden items-center gap-1.5 rounded-full bg-map-card px-3 py-1.5 text-2xs text-map-muted shadow-[0_2px_10px_rgb(22_21_15/0.18)] sm:flex">
              Trier par
              <span className="font-medium text-map-ink">Date</span>
              <ChevronDownIcon className="size-3 text-map-ink" />
            </span>
            <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-control sm:top-[58%] sm:bottom-auto sm:left-[62%] sm:ml-5 sm:translate-x-0 sm:-translate-y-1/2 bg-map-card px-3 py-2 shadow-[0_4px_16px_rgb(22_21_15/0.2)]">
              <span className="block text-2xs font-medium whitespace-nowrap text-map-ink">
                {preview.map.popup.title}
              </span>
              <span className="block text-[0.625rem] whitespace-nowrap text-map-muted">
                {preview.map.popup.detail}
              </span>
            </span>
          </MapPaper>

          <Panel title={preview.table.title} flush>
            <div
              className={`${TABLE_ROW} border-t bg-surface-2 py-2 text-2xs text-muted`}
            >
              <span>{preview.table.columns[0]}</span>
              <span>{preview.table.columns[1]}</span>
              <span className="text-right">{preview.table.columns[2]}</span>
            </div>
            <ul>
              {preview.table.rows.map((row) => (
                <li
                  key={row.title}
                  className={`${TABLE_ROW} items-center py-2.5 last:border-b-0`}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-control font-medium text-foreground">
                      {row.title}
                    </span>
                    <span className="block truncate text-2xs text-muted">
                      {row.place} · {row.candidates} candidats
                    </span>
                  </span>
                  <span className="text-control whitespace-nowrap text-muted tabular-nums">
                    {row.period}
                  </span>
                  <Badge
                    tone={row.status.tone}
                    variant="plain"
                    className="justify-self-end"
                  >
                    {row.status.label}
                  </Badge>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  );
}
