"use client";

import { useEffect, useMemo, useState } from "react";

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const workers = ["Antonio", "Lizzy", "Momo", "Cole", "Luis"];

type Timetable = {
  updatedAt: string;
  days: Record<string, Record<string, string>>;
};

function emptyTimetable(): Timetable {
  return {
    updatedAt: "",
    days: Object.fromEntries(
      days.map((day) => [day, Object.fromEntries(workers.map((worker) => [worker, ""]))])
    )
  };
}

export default function Home() {
  const [timetable, setTimetable] = useState<Timetable>(emptyTimetable);
  const [status, setStatus] = useState("Loading timetable...");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/timetable", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => {
        setTimetable(data);
        setStatus(data.updatedAt ? `Last updated ${new Date(data.updatedAt).toLocaleString()}` : "Ready");
      })
      .catch(() => setStatus("Could not load timetable. Try refreshing."));
  }, []);

  const whatsappText = useMemo(() => {
    const lines = ["GreenCorner Timetable", "Open: 10:00 AM - 2:00 AM", ""];

    days.forEach((day) => {
      lines.push(day);
      workers.forEach((worker) => {
        const shift = timetable.days[day]?.[worker]?.trim();
        if (shift) lines.push(`- ${worker}: ${shift}`);
      });
      lines.push("");
    });

    lines.push("Edit timetable here:");
    lines.push(typeof window === "undefined" ? "" : window.location.origin);
    return lines.join("\n").trim();
  }, [timetable]);

  function updateShift(day: string, worker: string, value: string) {
    setTimetable((current) => ({
      ...current,
      days: {
        ...current.days,
        [day]: {
          ...current.days[day],
          [worker]: value
        }
      }
    }));
  }

  async function save() {
    setSaving(true);
    setStatus("Saving...");

    try {
      const response = await fetch("/api/timetable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(timetable)
      });

      if (!response.ok) throw new Error("Save failed");
      const data = await response.json();
      setTimetable(data);
      setStatus(`Saved ${new Date(data.updatedAt).toLocaleString()}`);
    } catch {
      setStatus("Could not save. Try again.");
    } finally {
      setSaving(false);
    }
  }

  async function share() {
    await save();
    window.open(`https://wa.me/?text=${encodeURIComponent(whatsappText)}`, "_blank");
  }

  return (
    <main>
      <header>
        <p>Open 10:00 AM to 2:00 AM</p>
        <h1>GreenCorner Timetable</h1>
        <p>{status}</p>
      </header>

      <section className="actions" aria-label="Timetable actions">
        <button onClick={save} disabled={saving}>{saving ? "Saving..." : "Save for everyone"}</button>
        <button onClick={share} disabled={saving}>Share on WhatsApp</button>
        <button className="secondary" onClick={() => window.location.reload()}>Refresh</button>
      </section>

      <section className="tableWrap">
        <table>
          <thead>
            <tr>
              <th>Day</th>
              {workers.map((worker) => <th key={worker}>{worker}</th>)}
            </tr>
          </thead>
          <tbody>
            {days.map((day) => (
              <tr key={day}>
                <th>{day}</th>
                {workers.map((worker) => (
                  <td key={worker}>
                    <input
                      aria-label={`${day} ${worker}`}
                      placeholder="10-6 / off"
                      value={timetable.days[day]?.[worker] ?? ""}
                      onChange={(event) => updateShift(day, worker, event.target.value)}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
