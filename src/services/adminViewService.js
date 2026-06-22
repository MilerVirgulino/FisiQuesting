const STORAGE_KEY = "fisioquest.adminClassView";

export const adminViewGradeOptions = ["1 ano", "2 ano", "3 ano"];
export const adminViewClassOptions = ["A", "B", "C", "D", "E"];

export const defaultAdminClassView = {
  grade: "1 ano",
  className: "A"
};

export function readAdminClassView() {
  if (typeof window === "undefined" || !window.localStorage) return defaultAdminClassView;

  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "null");
    return normalizeAdminClassView(parsed);
  } catch {
    return defaultAdminClassView;
  }
}

export function writeAdminClassView(view) {
  const normalized = normalizeAdminClassView(view);
  if (typeof window !== "undefined" && window.localStorage) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  }
  return normalized;
}

export function normalizeAdminClassView(view) {
  return {
    grade: adminViewGradeOptions.includes(view?.grade) ? view.grade : defaultAdminClassView.grade,
    className: adminViewClassOptions.includes(view?.className) ? view.className : defaultAdminClassView.className
  };
}

export function getEffectiveClassProfile(profile, adminClassView) {
  if (profile?.role !== "admin") return profile;
  const normalized = normalizeAdminClassView(adminClassView);
  return {
    ...profile,
    grade: normalized.grade,
    className: normalized.className
  };
}
