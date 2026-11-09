export const COLORS = [
  {
    id: "emerald", label: "Смарагдовий", swatch: "#12806F", photo: "/komi/photo-emerald.webp", fur: "#2B785C",
    theme: { bg: "#0D3A2C", surface: "#134A39", surface2: "#1B5A46", line: "#2A6F58", text: "#FFFFFF", muted: "#B9D3C9", accent: "#FFFFFF", onAccent: "#0D3A2C", danger: "#FFB3A6" },
  },
  {
    id: "milk", label: "Молочний", swatch: "#EFE6D2", photo: "/komi/photo-milk.webp", fur: "#DBCFB8",
    theme: { bg: "#E9E0CF", surface: "#DDD2BD", surface2: "#CFC2A9", line: "#BBAC90", text: "#1A1712", muted: "#5F574A", accent: "#1A1712", onAccent: "#F4EEE2", danger: "#A32A17" },
  },
  {
    id: "grey", label: "Сірий", swatch: "#4A4F52", photo: "/komi/photo-grey.webp", fur: "#6E7078",
    theme: { bg: "#26282B", surface: "#32353A", surface2: "#3E4147", line: "#53565C", text: "#FFFFFF", muted: "#BFC1C5", accent: "#FFFFFF", onAccent: "#26282B", danger: "#FFB3A6" },
  },
  {
    id: "black", label: "Чорний", swatch: "#0E0E0E", photo: "/komi/photo-black.webp", fur: "#333338",
    theme: { bg: "#0E0E10", surface: "#1A1A1D", surface2: "#27272B", line: "#38383D", text: "#FFFFFF", muted: "#B3B3B8", accent: "#FFFFFF", onAccent: "#0E0E10", danger: "#FFB3A6" },
  },
  {
    id: "denim", label: "Джинс", swatch: "#43618F", photo: "/komi/photo-denim.webp", fur: "#6687B3",
    theme: { bg: "#1B3557", surface: "#24426A", surface2: "#2E507E", line: "#446A9B", text: "#FFFFFF", muted: "#C3D2E4", accent: "#FFFFFF", onAccent: "#1B3557", danger: "#FFB3A6" },
  },
] as const;

export const COLOR_LABELS: readonly string[] = COLORS.map((color) => color.label);

export const STATUSES = [
  { id: "new", label: "Нова" },
  { id: "in_progress", label: "В роботі" },
  { id: "closed", label: "Закрита" },
] as const;

export type LeadStatus = (typeof STATUSES)[number]["id"];

export type Lead = {
  id: string;
  created_at: string;
  name: string;
  phone: string;
  comment: string;
  color: string;
  status: LeadStatus;
};

export function isStatus(value: unknown): value is LeadStatus {
  return STATUSES.some((status) => status.id === value);
}

export function statusLabel(status: string) {
  return STATUSES.find((item) => item.id === status)?.label ?? status;
}

// Один формат і для Telegram, і для адмінки, щоб час збігався
export function formatTime(iso: string) {
  const parts = new Intl.DateTimeFormat("uk-UA", {
    timeZone: "Europe/Kyiv",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(new Date(iso));
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("day")}.${get("month")}.${get("year")}, ${get("hour")}:${get("minute")}:${get("second")}`;
}

export function normalizePhone(value: string) {
  const compact = value.replace(/[\s()-]/g, "");
  const match = compact.match(/^(?:\+?38)?(0\d{9})$/);
  return match ? `+38${match[1]}` : null;
}

// ПІБ: щонайменше два слова з літер
const FULL_NAME = /^\p{L}[\p{L}'’ʼ.-]*(?:\s+\p{L}[\p{L}'’ʼ.-]*)+$/u;

// comment зберігає адресу доставки Нової пошти
export type LeadInput = { name: string; phone: string; comment: string; color: string };
export type LeadErrors = Partial<Record<keyof LeadInput, string>>;

export function validateLead(input: Record<string, unknown>) {
  const text = (key: string) => (typeof input[key] === "string" ? (input[key] as string).trim() : "");
  const name = text("name");
  const comment = text("comment");
  const color = text("color");
  const phone = normalizePhone(text("phone"));

  const errors: LeadErrors = {};
  if (name.length > 80 || !FULL_NAME.test(name)) errors.name = "Вкажіть прізвище, ім'я та по батькові.";
  if (!phone) errors.phone = "Вкажіть номер у форматі 0671234567.";
  if (comment.length < 5 || comment.length > 300 || !/\p{L}/u.test(comment) || !/\d/.test(comment)) {
    errors.comment = "Вкажіть місто і номер відділення Нової пошти.";
  }
  if (!COLOR_LABELS.includes(color)) errors.color = "Оберіть колір костюма.";

  if (Object.keys(errors).length > 0) return { ok: false as const, errors };
  return { ok: true as const, lead: { name, phone: phone as string, comment, color } };
}
