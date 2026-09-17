const draftPrefix = "tempo:draft";

const isLocalStorageAvailable = () =>
  typeof window !== "undefined" && Boolean(window.localStorage);

export const getDraftStorageKey = (
  userId: string | null | undefined,
  draftName: string,
  scope?: string | null,
) =>
  [draftPrefix, userId || "anonymous", draftName, scope]
    .filter(Boolean)
    .map((part) => encodeURIComponent(String(part)))
    .join(":");

export const readDraft = <T>(key: string | null, fallback: T): T => {
  if (!key || !isLocalStorageAvailable()) {
    return fallback;
  }

  try {
    const savedValue = window.localStorage.getItem(key);

    return savedValue ? (JSON.parse(savedValue) as T) : fallback;
  } catch {
    return fallback;
  }
};

export const writeDraft = <T>(key: string | null, value: T) => {
  if (!key || !isLocalStorageAvailable()) {
    return;
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Draft persistence is best-effort and should not block the main workflow.
  }
};

export const removeDraft = (key: string | null) => {
  if (!key || !isLocalStorageAvailable()) {
    return;
  }

  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore localStorage cleanup failures.
  }
};
