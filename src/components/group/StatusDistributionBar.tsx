import React from "react";
import { StatusOption, Task } from "@/types/task";

function normalizeStatus(value: unknown) {
  return String(value ?? "").trim() || "No Status";
}

type Props = {
  tasks: Task[];
  availableStatuses: StatusOption[];
  className?: string;
};

const StatusDistributionBar: React.FC<Props> = ({ tasks, availableStatuses, className }) => {
  const total = tasks.length;

  const colorByStatus = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const s of availableStatuses) map.set(s.name, s.color);
    // Ensure a sensible default for "No Status"
    if (!map.has("No Status")) map.set("No Status", "#ffffff");
    return map;
  }, [availableStatuses]);

  const counts = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const task of tasks) {
      const name = normalizeStatus(task.status);
      map.set(name, (map.get(name) ?? 0) + 1);
    }
    return map;
  }, [tasks]);

  const segments = React.useMemo(() => {
    if (total === 0) return [] as { name: string; count: number; color: string; percent: number }[];

    const orderedNames = availableStatuses.map((s) => s.name);
    const namesFromTasks = Array.from(counts.keys()).filter((name) => !orderedNames.includes(name));

    const ordered = [...orderedNames, ...namesFromTasks];

    const list: { name: string; count: number; color: string; percent: number }[] = [];
    for (const name of ordered) {
      const count = counts.get(name) ?? 0;
      if (count <= 0) continue;
      const color = colorByStatus.get(name) ?? "#ffffff";
      list.push({ name, count, color, percent: (count / total) * 100 });
    }
    return list;
  }, [availableStatuses, colorByStatus, counts, total]);

  const title = segments.length
    ? segments.map((s) => `${s.name}: ${s.count}`).join(" • ")
    : total === 0
      ? "No tasks"
      : "";

  return (
    <div className={className}>
      <div
        className="h-2 w-full overflow-hidden rounded-sm border border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800"
        title={title}
        aria-label={title}
        role="img"
      >
        <div className="flex h-full w-full">
          {segments.map((s) => (
            <div
              key={s.name}
              className="h-full"
              style={{ width: `${s.percent}%`, backgroundColor: s.color }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default StatusDistributionBar;
