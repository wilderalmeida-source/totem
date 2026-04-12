import { PREMIUM_FEMALE, PREMIUM_MALE, CHEAP_FEMALE, CHEAP_MALE, GOOGLE_VOICES, } from "./voicesList";
import { PrismaLog } from "./prismalog";
import crypto from "crypto";

// =======================
// Semana travada em SP
// - Semana vira no DOMINGO 00:00 (America/Sao_Paulo)
// - Independente do timezone do servidor
// =======================
const TZ = "America/Sao_Paulo";
const ONE_DAY = 24 * 60 * 60 * 1000;

type YMD = { y: number; m: number; d: number }; // m: 1..12

function getYMDInTZ(date: Date, timeZone = TZ): YMD {
  const dtf = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = dtf.formatToParts(date);
  const y = Number(parts.find((p) => p.type === "year")!.value);
  const m = Number(parts.find((p) => p.type === "month")!.value);
  const d = Number(parts.find((p) => p.type === "day")!.value);
  return { y, m, d };
}

// Cria uma Date UTC somente para contas de calendário (não é "hora real" de SP)
function utcFromYMD({ y, m, d }: YMD): Date {
  return new Date(Date.UTC(y, m - 1, d));
}

// 0=domingo..6=sábado baseado no YMD (independente do servidor)
function dayOfWeekFromYMD(ymd: YMD): number {
  return utcFromYMD(ymd).getUTCDay();
}

function addDaysYMD(ymd: YMD, deltaDays: number): YMD {
  const dt = utcFromYMD(ymd);
  dt.setUTCDate(dt.getUTCDate() + deltaDays);
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
}

// Início da semana (domingo)
function startOfWeekSundayYMD(ymd: YMD): YMD {
  const dow = dayOfWeekFromYMD(ymd); // 0=domingo
  return addDaysYMD(ymd, -dow);
}

// Domingo da semana que contém 01/01
function firstSundayOfYearYMD(year: number): YMD {
  const jan1: YMD = { y: year, m: 1, d: 1 };
  const dow = dayOfWeekFromYMD(jan1);
  return addDaysYMD(jan1, -dow);
}

// Semana do ano (1..53) virando no domingo, travada em SP
export function getWeekOfYearSundaySP(now = new Date()): number {
  const ymd = getYMDInTZ(now, TZ);
  const weekStart = startOfWeekSundayYMD(ymd);
  const firstSunday = firstSundayOfYearYMD(ymd.y);

  const diffMs = utcFromYMD(weekStart).getTime() - utcFromYMD(firstSunday).getTime();
  const diffDays = Math.round(diffMs / ONE_DAY);
  return Math.floor(diffDays / 7) + 1;
}

// Semana do mês (1..6) virando no domingo, travada em SP
export function getWeekOfMonthSundaySP(now = new Date()): number {
  const ymd = getYMDInTZ(now, TZ);
  const weekStart = startOfWeekSundayYMD(ymd);

  const firstOfMonth: YMD = { y: ymd.y, m: ymd.m, d: 1 };
  const firstSundayOfMonth = addDaysYMD(firstOfMonth, -dayOfWeekFromYMD(firstOfMonth));

  const diffMs =
    utcFromYMD(weekStart).getTime() - utcFromYMD(firstSundayOfMonth).getTime();
  const diffDays = Math.round(diffMs / ONE_DAY);
  return Math.floor(diffDays / 7) + 1;
}

// =======================
// Hash determinístico (string -> number)
// =======================
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0; // uint32
  }
  return hash;
}

// =======================
// Voz semanal determinística
// - usa SEMPRE o mesmo `now` passado
// - semana vira no domingo em SP
// =======================
function getWeeklyRandomVoice(now = new Date()): string {
  const { y: year, m: month } = getYMDInTZ(now, TZ);
  const weekOfYear = getWeekOfYearSundaySP(now);
  const weekOfMonth = getWeekOfMonthSundaySP(now);

  const isFemaleWeek = weekOfYear % 2 === 0; // alterna por semana
  const isPremiumWeek = weekOfMonth === 2;   // só a 2ª semana do mês é premium

  const key = `${year}-${month}-W${weekOfYear}`;
  const h = hashString(key);

  const pool = isPremiumWeek
    ? isFemaleWeek
      ? PREMIUM_FEMALE
      : PREMIUM_MALE
    : isFemaleWeek
      ? CHEAP_FEMALE
      : CHEAP_MALE;

  const index = h % pool.length;
  return pool[index];
}

// =======================
// Resolver voz efetiva (override/env/auto)
// - usa semana travada em SP
// - usa o MESMO now para tudo
// =======================
export async function resolveEffectiveVoice(now = new Date()) {
  const { y: year } = getYMDInTZ(now, TZ);
  const week = getWeekOfYearSundaySP(now);

  const envForced = process.env.GOOGLE_VOICE_NAME;
  const autoVoice = getWeeklyRandomVoice(now);

  const override = await PrismaLog.ttsVoiceOverride.findUnique({
    where: { year_week: { year, week } },
  });

  const effectiveVoice =
    envForced && GOOGLE_VOICES.includes(envForced)
      ? envForced
      : override?.voiceName ?? autoVoice;

  const buscaRate = await PrismaLog.ttsSettings.findFirst();
  const rate = buscaRate?.rate ?? 1.0;
  const volumeSound = buscaRate?.volumeSound ?? 0.0;

  return {
    year,
    week,
    autoVoice,
    overrideVoice: override?.voiceName ?? null,
    envForced:
      envForced && GOOGLE_VOICES.includes(envForced) ? envForced : null,
    voiceName: effectiveVoice,
    hasOverride: !!override?.voiceName,
    rate,
    volumeSound,
  };
}

// =======================
// Dicionário (normalização + applyDictionary)
// =======================
export function normalizeKey(s: string) {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove acentos
    .replace(/\s+/g, " ");
}

export async function applyDictionary(text: string) {
  // troca palavra a palavra (bom p/ nomes)
  const parts = text.trim().split(/\s+/);
  const keys = parts.map(normalizeKey);

  const dictRows = await PrismaLog.nameDictionary.findMany({
    where: { key: { in: keys } },
  });

  const dict = new Map(dictRows.map((r: any) => [r.key, r.value]));

  const replaced = parts.map((p) => {
    const k = normalizeKey(p);
    return dict.get(k) ?? p;
  });

  return replaced.join(" ");
}

// =======================
// Cache key (TTS)
// =======================
export function makeCacheKey(opts: {
  voiceName: string;
  volume: number;
  rate: number;
  text: string; // texto final
}) {
  const payload = JSON.stringify({
    v: 1, // versiona a chave
    voice: opts.voiceName,
    rate: Number(opts.rate.toFixed(2)),
    text: opts.text.trim(),
    volume: Number(opts.volume),
  });

  return crypto.createHash("sha256").update(payload).digest("hex");
}