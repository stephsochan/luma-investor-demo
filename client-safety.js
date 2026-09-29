const HTML_ENTITIES = Object.freeze({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  "\"": "&quot;",
  "'": "&#39;"
});

export function escapeHtml(value = "") {
  return String(value ?? "").replace(/[&<>"']/g, character => HTML_ENTITIES[character]);
}

export function escapeAttribute(value = "") {
  return escapeHtml(value);
}

export function safeMediaUrl(value, baseHref = globalThis.location?.href) {
  if (typeof value !== "string" || value !== value.trim() || value.length < 1 || value.length > 2048) return "";
  if (value.startsWith("//") || value.includes("\\") || /[\u0000-\u0020\u007f]/u.test(value) || !baseHref) return "";
  try {
    const base = new URL(baseHref);
    const url = new URL(value, base);
    const sameOriginWebUrl = url.origin === base.origin && (url.protocol === "http:" || url.protocol === "https:");
    if ((!sameOriginWebUrl && url.protocol !== "https:") || url.username || url.password || url.hash) return "";
    return url.href;
  } catch {
    return "";
  }
}

function displayNumber(value, fallback, minimum, maximum) {
  return typeof value === "number" && Number.isFinite(value) && value >= minimum && value <= maximum ? value : fallback;
}

export function safeProfile(profile, baseHref = globalThis.location?.href) {
  const source = profile && typeof profile === "object" && !Array.isArray(profile) ? profile : {};
  const safe = { ...source };
  for (const field of ["id", "name", "gender", "city", "job", "intent", "bio", "emoji"]) safe[field] = escapeHtml(source[field]);
  safe.tags = Array.isArray(source.tags) ? source.tags.slice(0, 10).map(escapeHtml) : [];
  safe.badges = Array.isArray(source.badges) ? source.badges.slice(0, 20).map(escapeHtml) : [];
  safe.image = escapeAttribute(safeMediaUrl(source.image, baseHref));
  safe.age = displayNumber(source.age, 0, 0, 130);
  safe.distance = displayNumber(source.distance, 0, 0, 100000);
  safe.online = source.online === true;
  return safe;
}
