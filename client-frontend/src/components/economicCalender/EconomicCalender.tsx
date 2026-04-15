import { useQuery } from "@tanstack/react-query";
import { fetchHighImpactEvents, type EconomicCalendarEvent } from "../../utils/api";

const CURRENCY_FLAGS: Record<string, string> = {
  USD: "🇺🇸",
  GBP: "🇬🇧",
  JPY: "🇯🇵",
  CHF: "🇨🇭",
  CAD: "🇨🇦",
  EUR: "🇪🇺",
  AUD: "🇦🇺",
  NZD: "🇳🇿",
  CNY: "🇨🇳",
};

const CURRENCY_COLORS: Record<string, string> = {
  USD: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  GBP: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  JPY: "bg-red-500/20 text-red-400 border-red-500/30",
  CHF: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  CAD: "bg-green-500/20 text-green-400 border-green-500/30",
  EUR: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  AUD: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  NZD: "bg-teal-500/20 text-teal-400 border-teal-500/30",
  CNY: "bg-rose-500/20 text-rose-400 border-rose-500/30",
};

const DEFAULT_CURRENCY_COLOR = "bg-gray-500/20 text-gray-400 border-gray-500/30";

// Convert UTC datetime to MT5 (UTC+2) as "YYYY-MM-DD HH:MM"
// Uses Date.UTC to avoid any local timezone interference
function toMT5String(event: EconomicCalendarEvent): string {
  const raw = event.event_datetime_gmt2 || event.event_datetime || "";
  const normalized = raw.replace(" ", "T").replace(/Z$/, "");
  const [datePart, timePart] = normalized.split("T");
  if (!datePart || !timePart) return "";
  const [y, mo, d] = datePart.split("-").map(Number);
  const [h, mi] = timePart.split(":").map(Number);

  // Only add +2h offset if using event_datetime (UTC), not gmt2
  const offsetHours = event.event_datetime_gmt2 ? 0 : 2;
  const ms = Date.UTC(y, mo - 1, d, h + offsetHours, mi);
  const mt5 = new Date(ms);
  const yy = mt5.getUTCFullYear();
  const mm = String(mt5.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(mt5.getUTCDate()).padStart(2, "0");
  const hh = String(mt5.getUTCHours()).padStart(2, "0");
  const min = String(mt5.getUTCMinutes()).padStart(2, "0");
  return `${yy}-${mm}-${dd} ${hh}:${min}`;
}

function formatMT5Time(event: EconomicCalendarEvent): string {
  // "2026-02-12 15:30" → "15:30"
  const mt5 = toMT5String(event);
  return mt5.slice(11, 16) || "--:--";
}

function formatDateGroup(event: EconomicCalendarEvent): string {
  const dateStr = getDateKey(event); // "2026-02-12"
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

function getDateKey(event: EconomicCalendarEvent): string {
  // "2026-02-12 15:30" → "2026-02-12"
  return toMT5String(event).slice(0, 10);
}

function groupEventsByDate(
  events: EconomicCalendarEvent[]
): [string, EconomicCalendarEvent[]][] {
  const groups: Record<string, EconomicCalendarEvent[]> = {};
  const sorted = [...events].sort(
    (a, b) => toMT5String(a).localeCompare(toMT5String(b))
  );
  for (const event of sorted) {
    const key = getDateKey(event);
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(event);
  }
  return Object.entries(groups);
}

function ValueCell({
  value,
  forecast,
  label,
}: {
  value: string | null;
  forecast?: string | null;
  label: string;
}) {
  let colorClass = "text-[#85A8C3]";

  if (label === "Actual" && value != null && forecast != null) {
    const actual = parseFloat(value.replace(/[^0-9.-]/g, ""));
    const fore = parseFloat(forecast.replace(/[^0-9.-]/g, ""));
    if (!isNaN(actual) && !isNaN(fore)) {
      if (actual > fore) colorClass = "text-emerald-400";
      else if (actual < fore) colorClass = "text-red-400";
    }
  }

  return (
    <div className="flex flex-col items-center min-w-[70px]">
      <span className="text-[10px] uppercase tracking-wider text-[#506882] mb-1">
        {label}
      </span>
      <span className={`text-sm font-medium ${colorClass}`}>
        {value ?? "\u2014"}
      </span>
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 px-4 py-3 animate-pulse">
      <div className="w-12 h-4 rounded bg-[rgba(40,191,255,0.08)]" />
      <div className="w-16 h-6 rounded-full bg-[rgba(40,191,255,0.08)]" />
      <div className="flex-1 h-4 rounded bg-[rgba(40,191,255,0.08)]" />
      <div className="w-14 h-4 rounded bg-[rgba(40,191,255,0.08)]" />
      <div className="w-14 h-4 rounded bg-[rgba(40,191,255,0.08)]" />
      <div className="w-14 h-4 rounded bg-[rgba(40,191,255,0.08)]" />
    </div>
  );
}

const EconomicCalendar = () => {
  const { data, isLoading, isError, error, refetch } = useQuery<EconomicCalendarEvent[]>({
    queryKey: ["economic-calendar-high-impact"],
    queryFn: fetchHighImpactEvents,
    retry: 1,
  });

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-[rgba(40,191,255,0.05)] bg-[#3AB3FF]/10 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">
          Economic Calendar
        </h2>
        <div className="space-y-2">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <SkeletonRow key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-2xl border border-[rgba(40,191,255,0.05)] bg-[#3AB3FF]/10 p-6 flex flex-col items-center justify-center min-h-[300px]">
        <svg
          className="w-12 h-12 text-red-400 mb-3"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
          />
        </svg>
        <p className="text-[#85A8C3] text-sm mb-3">
          {error instanceof Error ? error.message : "Failed to load events"}
        </p>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 rounded-lg bg-blue-500/20 text-blue-400 text-sm hover:bg-blue-500/30 transition-colors border border-blue-500/30"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <div className="rounded-2xl border border-[rgba(40,191,255,0.05)] bg-[#3AB3FF]/10 p-6 flex flex-col items-center justify-center min-h-[300px]">
        <svg
          className="w-12 h-12 text-[#506882] mb-3"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
          />
        </svg>
        <p className="text-[#85A8C3] text-sm">
          No high-impact events found
        </p>
      </div>
    );
  }

  const grouped = groupEventsByDate(data);

  return (
    <div className="rounded-2xl border border-[rgba(40,191,255,0.05)] bg-[#3AB3FF]/10 overflow-hidden">
      <div className="px-6 pt-6 pb-3">
        <h2 className="text-lg font-semibold text-white">
          Economic Calendar
          <span className="ml-2 text-xs font-normal text-[#506882]">
            MT5 Server Time (UTC+2)
          </span>
        </h2>
      </div>

      {grouped.map(([dateKey, events]) => (
        <div key={dateKey}>
          <div className="px-6 py-2 border-t border-[rgba(40,191,255,0.06)] bg-[rgba(40,191,255,0.02)]">
            <span className="text-sm font-medium text-[#85A8C3]">
              {formatDateGroup(events[0])}
            </span>
          </div>

          {events.map((event) => (
            <div
              key={event.id}
              className="flex flex-wrap items-center gap-x-4 gap-y-2 px-6 py-3 border-t border-[rgba(40,191,255,0.04)] hover:bg-[rgba(40,191,255,0.03)] transition-colors"
            >
              <div className="flex items-center gap-1.5 min-w-[60px]">
                <svg
                  className="w-3.5 h-3.5 text-[#506882]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="text-sm font-mono text-white">
                  {formatMT5Time(event)}
                </span>
              </div>

              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                  CURRENCY_COLORS[event.currency] || DEFAULT_CURRENCY_COLOR
                }`}
              >
                <span>{CURRENCY_FLAGS[event.currency] || ""}</span>
                {event.currency}
              </span>

              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-red-500/20 text-red-400 border border-red-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" />
                HIGH
              </span>

              <span className="flex-1 text-sm text-white min-w-[150px]">
                {event.event_name}
              </span>

              <div className="flex items-center gap-4">
                <ValueCell
                  value={event.forecast_value}
                  label="Forecast"
                />
                <ValueCell
                  value={event.previous_value}
                  label="Previous"
                />
                <ValueCell
                  value={event.actual_value}
                  forecast={event.forecast_value}
                  label="Actual"
                />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

export default EconomicCalendar;
