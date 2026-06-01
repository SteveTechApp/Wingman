export type WingmanTimeContext = {
  greeting: string;
  clockLabel: string;
  dateLabel: string;
  occasionLabel: string | null;
  topbarLabel: string;
};

const fixedOccasions: Record<string, string> = {
  "01-01": "New Year's Day",
  "02-14": "Valentine's Day",
  "03-08": "International Women's Day",
  "03-17": "St Patrick's Day",
  "04-22": "Earth Day",
  "05-04": "Star Wars Day",
  "06-05": "World Environment Day",
  "10-31": "Halloween",
  "11-21": "World Television Day",
  "12-24": "Christmas Eve",
  "12-25": "Christmas Day",
  "12-26": "Boxing Day",
  "12-31": "New Year's Eve",
};

const localeByLanguageId: Record<string, string> = {
  "en-GB": "en-GB",
  "fr-FR": "fr-FR",
  "es-ES": "es-ES",
  "pt-PT": "pt-PT",
  "de-DE": "de-DE",
  "it-IT": "it-IT",
  "ru-RU": "ru-RU",
  "zh-CN": "zh-CN",
  "en-IN": "en-IN",
  "hi-IN": "hi-IN",
  "en-SG": "en-SG",
  "sv-SE": "sv-SE",
  "nb-NO": "nb-NO",
  "nl-NL": "nl-NL",
};

const greetingByLanguageId: Record<string, { morning: string; afternoon: string; evening: string; today: string }> = {
  "en-GB": { morning: "Good morning", afternoon: "Good afternoon", evening: "Good evening", today: "Today" },
  "es-ES": { morning: "Buenos dias", afternoon: "Buenas tardes", evening: "Buenas noches", today: "Hoy" },
  "fr-FR": { morning: "Bonjour", afternoon: "Bon apres-midi", evening: "Bonsoir", today: "Aujourd'hui" },
  "de-DE": { morning: "Guten Morgen", afternoon: "Guten Tag", evening: "Guten Abend", today: "Heute" },
  "it-IT": { morning: "Buongiorno", afternoon: "Buon pomeriggio", evening: "Buonasera", today: "Oggi" },
  "pt-PT": { morning: "Bom dia", afternoon: "Boa tarde", evening: "Boa noite", today: "Hoje" },
  "nl-NL": { morning: "Goedemorgen", afternoon: "Goedemiddag", evening: "Goedenavond", today: "Vandaag" },
};

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function monthDayKey(date: Date) {
  return `${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function sameMonthDay(left: Date, right: Date) {
  return left.getMonth() === right.getMonth() && left.getDate() === right.getDate();
}

function getWesternEasterDate(year: number) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;

  return new Date(year, month - 1, day);
}

function getTimeGreeting(date: Date, languageId = "en-GB") {
  const hour = date.getHours();
  const labels = greetingByLanguageId[languageId] ?? greetingByLanguageId["en-GB"];

  if (hour >= 5 && hour < 12) {
    return labels.morning;
  }

  if (hour >= 12 && hour < 17) {
    return labels.afternoon;
  }

  return labels.evening;
}

function getOccasionLabel(date: Date) {
  const fixed = fixedOccasions[monthDayKey(date)];

  if (fixed) {
    return fixed;
  }

  const easterSunday = getWesternEasterDate(date.getFullYear());

  if (sameMonthDay(date, addDays(easterSunday, -2))) {
    return "Good Friday";
  }

  if (sameMonthDay(date, easterSunday)) {
    return "Easter Sunday";
  }

  if (sameMonthDay(date, addDays(easterSunday, 1))) {
    return "Easter Monday";
  }

  return null;
}

export function getWingmanTimeContext(now = new Date(), languageId = "en-GB"): WingmanTimeContext {
  const locale = localeByLanguageId[languageId] ?? "en-GB";
  const greeting = getTimeGreeting(now, languageId);
  const todayLabel = greetingByLanguageId[languageId]?.today ?? "Today";

  const clockLabel = now.toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const dateLabel = now.toLocaleDateString(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  const occasionLabel = getOccasionLabel(now);
  const topbarLabel = occasionLabel
    ? ` • ${dateLabel}, ${clockLabel} • ${todayLabel}: ${occasionLabel}`
    : ` • ${dateLabel}, ${clockLabel}`;

  return {
    greeting,
    clockLabel,
    dateLabel,
    occasionLabel,
    topbarLabel,
  };
}