import { arc } from "d3";
import { useMemo } from "react";
import { RecordItem, analyze, classify } from "./engine";
const palette = [
  "#b7a0ff",
  "#66dfc0",
  "#f5bf75",
  "#76baff",
  "#ef99c7",
  "#e2df83",
  "#99c8b0",
  "#b8a9e9",
];
export default function Footprint({
  records,
  onSelect,
}: {
  records: RecordItem[];
  onSelect: (name: string, e: RecordItem[]) => void;
}) {
  const model = useMemo(() => {
    const dated = records.filter((r) => r.time !== null);
    if (!dated.length) return null;
    const end = dated.reduce((latest, r) => Math.max(latest, r.time!), 0);
    const dayEnd = new Date(end);
    dayEnd.setHours(23, 59, 59, 999);
    const current = dated.filter((r) => r.time! > end - 30 * 86400000);
    const previous = dated.filter(
      (r) => r.time! <= end - 30 * 86400000 && r.time! > end - 60 * 86400000,
    );
    const currentA = analyze(current),
      previousA = analyze(previous);
    const names = [
      ...new Set(
        [...currentA.interests, ...previousA.interests].map((c) => c.name),
      ),
    ];
    const calendar = Array.from({ length: 91 }, (_, i) => {
      const date = new Date(dayEnd);
      date.setDate(date.getDate() - 90 + i);
      return {
        date,
        records: dated.filter(
          (r) => new Date(r.time!).toDateString() === date.toDateString(),
        ),
      };
    });
    return { end, current, previous, names, currentA, previousA, calendar };
  }, [records]);
  if (!model) return null;
  const ring = (
    rows: ReturnType<typeof analyze>["interests"],
    inner: number,
    outer: number,
  ) => {
    let angle = 0;
    const total = rows.reduce((n, c) => n + c.evidence.length, 0);
    return rows.map((c) => {
      const start = angle;
      angle += (c.evidence.length / total) * Math.PI * 2;
      return (
        <path
          key={c.name}
          d={
            arc()({
              innerRadius: inner,
              outerRadius: outer,
              startAngle: start,
              endAngle: angle,
              padAngle: 0.025,
            }) || ""
          }
          fill={palette[model.names.indexOf(c.name) % 8]}
          role="button"
          tabIndex={0}
          onClick={() => onSelect(c.name, c.evidence)}
          onKeyDown={(e) => e.key === "Enter" && onSelect(c.name, c.evidence)}
        >
          <title>
            {c.name}: {c.evidence.length} category matches
          </title>
        </path>
      );
    });
  };
  return (
    <>
      <section className="panel padded">
        <h3>Activity calendar · 91 observed days</h3>
        <p>
          Window ends on {new Date(model.end).toLocaleDateString()}, your most
          recent timestamped record. Empty cells mean no imported evidence, not
          necessarily no browsing.
        </p>
        <div className="activity-calendar">
          {model.calendar.map(({ date, records }) => (
            <button
              key={date.toDateString()}
              style={{
                background: records.length
                  ? `rgba(174,145,248,${Math.min(0.95, 0.15 + Math.log(records.length + 1) / 4)})`
                  : "var(--soft)",
              }}
              title={`${date.toLocaleDateString()}: ${records.length} records`}
              aria-label={`${date.toLocaleDateString()}, ${records.length} records`}
              onClick={() => onSelect(date.toDateString(), records)}
            >
              <span>{date.getDate()}</span>
            </button>
          ))}
        </div>
        <p>Select a day to inspect its records.</p>
      </section>
      <section className="panel padded">
        <h3>How your interests shift</h3>
        <p>
          Outer ring: latest 30 days. Inner ring: preceding 30 days. Anchored to
          your most recent record. Category matches may overlap; export coverage
          can change the result.
        </p>
        <div className="shift-layout">
          <svg viewBox="0 0 320 300" className="shift-chart">
            <g transform="translate(160,150)">
              <circle
                r="112"
                fill="none"
                stroke="var(--line)"
                strokeWidth="28"
              />
              <circle
                r="75"
                fill="none"
                stroke="var(--line)"
                strokeWidth="23"
              />
              {ring(model.currentA.interests, 98, 126)}
              {ring(model.previousA.interests, 64, 87)}
              <text textAnchor="middle" y="-2" fill="var(--text)" fontSize="24">
                30 / 30
              </text>
              <text textAnchor="middle" y="19" fill="var(--muted)" fontSize="9">
                DAY COMPARISON
              </text>
            </g>
          </svg>
          <div className="shift-legend">
            {model.names.map((name, i) => {
              const now = model.currentA.interests.find((c) => c.name === name),
                before = model.previousA.interests.find((c) => c.name === name);
              const n = now?.score || 0,
                b = before?.score || 0;
              return (
                <button
                  className="list-row"
                  key={name}
                  onClick={() =>
                    onSelect(name, [
                      ...(now?.evidence || []),
                      ...(before?.evidence || []),
                    ])
                  }
                >
                  <span>
                    <i
                      className="legend"
                      style={{ background: palette[i % 8] }}
                    />{" "}
                    {name}
                  </span>
                  <span>
                    {model.current.length >= 5 && model.previous.length >= 5
                      ? `${n - b >= 0 ? "+" : ""}${n - b} pp`
                      : "INSUFFICIENT DATA"}
                  </span>
                </button>
              );
            })}
            <p>
              {model.current.length} recent / {model.previous.length} previous
              records. Change = percentage-point difference in matching-record
              share; minimum 5 records per window. Not a causal or validated
              preference change.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
