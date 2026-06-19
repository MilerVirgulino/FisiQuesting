export function todayKey(date = new Date()) {
  return toDateKey(date);
}

export function toDateKey(value = new Date()) {
  if (typeof value === "string") {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    return toDateKey(new Date(value));
  }

  if (typeof value === "number") {
    return toDateKey(new Date(value));
  }

  if (value?.toDate) {
    return toDateKey(value.toDate());
  }

  const date = value instanceof Date ? value : new Date();
  if (Number.isNaN(date.getTime())) return toDateKey(new Date());

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function maybeDateKey(value) {
  if (!value) return "";

  if (typeof value === "string") {
    if (!value.trim()) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? "" : toDateKey(parsed);
  }

  if (typeof value === "number") {
    return toDateKey(value);
  }

  if (value?.toDate) {
    return toDateKey(value.toDate());
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? "" : toDateKey(value);
  }

  return "";
}
