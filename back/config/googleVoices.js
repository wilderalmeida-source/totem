"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWeekOfYearSundaySP = getWeekOfYearSundaySP;
exports.getWeekOfMonthSundaySP = getWeekOfMonthSundaySP;
exports.resolveEffectiveVoice = resolveEffectiveVoice;
exports.normalizeKey = normalizeKey;
exports.applyDictionary = applyDictionary;
exports.makeCacheKey = makeCacheKey;
const voicesList_1 = require("./voicesList");
const prismalog_1 = require("./prismalog");
const crypto_1 = __importDefault(require("crypto"));
// =======================
// Semana travada em SP
// - Semana vira no DOMINGO 00:00 (America/Sao_Paulo)
// - Independente do timezone do servidor
// =======================
const TZ = "America/Sao_Paulo";
const ONE_DAY = 24 * 60 * 60 * 1000;
function getYMDInTZ(date, timeZone = TZ) {
    const dtf = new Intl.DateTimeFormat("en-CA", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    });
    const parts = dtf.formatToParts(date);
    const y = Number(parts.find((p) => p.type === "year").value);
    const m = Number(parts.find((p) => p.type === "month").value);
    const d = Number(parts.find((p) => p.type === "day").value);
    return { y, m, d };
}
// Cria uma Date UTC somente para contas de calendário (não é "hora real" de SP)
function utcFromYMD({ y, m, d }) {
    return new Date(Date.UTC(y, m - 1, d));
}
// 0=domingo..6=sábado baseado no YMD (independente do servidor)
function dayOfWeekFromYMD(ymd) {
    return utcFromYMD(ymd).getUTCDay();
}
function addDaysYMD(ymd, deltaDays) {
    const dt = utcFromYMD(ymd);
    dt.setUTCDate(dt.getUTCDate() + deltaDays);
    return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
}
// Início da semana (domingo)
function startOfWeekSundayYMD(ymd) {
    const dow = dayOfWeekFromYMD(ymd); // 0=domingo
    return addDaysYMD(ymd, -dow);
}
// Domingo da semana que contém 01/01
function firstSundayOfYearYMD(year) {
    const jan1 = { y: year, m: 1, d: 1 };
    const dow = dayOfWeekFromYMD(jan1);
    return addDaysYMD(jan1, -dow);
}
// Semana do ano (1..53) virando no domingo, travada em SP
function getWeekOfYearSundaySP(now = new Date()) {
    const ymd = getYMDInTZ(now, TZ);
    const weekStart = startOfWeekSundayYMD(ymd);
    const firstSunday = firstSundayOfYearYMD(ymd.y);
    const diffMs = utcFromYMD(weekStart).getTime() - utcFromYMD(firstSunday).getTime();
    const diffDays = Math.round(diffMs / ONE_DAY);
    return Math.floor(diffDays / 7) + 1;
}
// Semana do mês (1..6) virando no domingo, travada em SP
function getWeekOfMonthSundaySP(now = new Date()) {
    const ymd = getYMDInTZ(now, TZ);
    const weekStart = startOfWeekSundayYMD(ymd);
    const firstOfMonth = { y: ymd.y, m: ymd.m, d: 1 };
    const firstSundayOfMonth = addDaysYMD(firstOfMonth, -dayOfWeekFromYMD(firstOfMonth));
    const diffMs = utcFromYMD(weekStart).getTime() - utcFromYMD(firstSundayOfMonth).getTime();
    const diffDays = Math.round(diffMs / ONE_DAY);
    return Math.floor(diffDays / 7) + 1;
}
// =======================
// Hash determinístico (string -> number)
// =======================
function hashString(str) {
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
function getWeeklyRandomVoice(now = new Date()) {
    const { y: year, m: month } = getYMDInTZ(now, TZ);
    const weekOfYear = getWeekOfYearSundaySP(now);
    const weekOfMonth = getWeekOfMonthSundaySP(now);
    const isFemaleWeek = weekOfYear % 2 === 0; // alterna por semana
    const isPremiumWeek = weekOfMonth === 2; // só a 2ª semana do mês é premium
    const key = `${year}-${month}-W${weekOfYear}`;
    const h = hashString(key);
    const pool = isPremiumWeek
        ? isFemaleWeek
            ? voicesList_1.PREMIUM_FEMALE
            : voicesList_1.PREMIUM_MALE
        : isFemaleWeek
            ? voicesList_1.CHEAP_FEMALE
            : voicesList_1.CHEAP_MALE;
    const index = h % pool.length;
    return pool[index];
}
// =======================
// Resolver voz efetiva (override/env/auto)
// - usa semana travada em SP
// - usa o MESMO now para tudo
// =======================
async function resolveEffectiveVoice(now = new Date()) {
    const { y: year } = getYMDInTZ(now, TZ);
    const week = getWeekOfYearSundaySP(now);
    const envForced = process.env.GOOGLE_VOICE_NAME;
    const autoVoice = getWeeklyRandomVoice(now);
    const override = await prismalog_1.PrismaLog.ttsVoiceOverride.findUnique({
        where: { year_week: { year, week } },
    });
    const effectiveVoice = envForced && voicesList_1.GOOGLE_VOICES.includes(envForced)
        ? envForced
        : override?.voiceName ?? autoVoice;
    const buscaRate = await prismalog_1.PrismaLog.ttsSettings.findFirst();
    const rate = buscaRate?.rate ?? 1.0;
    const volumeSound = buscaRate?.volumeSound ?? 0.0;
    return {
        year,
        week,
        autoVoice,
        overrideVoice: override?.voiceName ?? null,
        envForced: envForced && voicesList_1.GOOGLE_VOICES.includes(envForced) ? envForced : null,
        voiceName: effectiveVoice,
        hasOverride: !!override?.voiceName,
        rate,
        volumeSound,
    };
}
// =======================
// Dicionário (normalização + applyDictionary)
// =======================
function normalizeKey(s) {
    return s
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // remove acentos
        .replace(/\s+/g, " ");
}
async function applyDictionary(text) {
    // troca palavra a palavra (bom p/ nomes)
    const parts = text.trim().split(/\s+/);
    const keys = parts.map(normalizeKey);
    const dictRows = await prismalog_1.PrismaLog.nameDictionary.findMany({
        where: { key: { in: keys } },
    });
    const dict = new Map(dictRows.map((r) => [r.key, r.value]));
    const replaced = parts.map((p) => {
        const k = normalizeKey(p);
        return dict.get(k) ?? p;
    });
    return replaced.join(" ");
}
// =======================
// Cache key (TTS)
// =======================
function makeCacheKey(opts) {
    const payload = JSON.stringify({
        v: 1, // versiona a chave
        voice: opts.voiceName,
        rate: Number(opts.rate.toFixed(2)),
        text: opts.text.trim(),
        volume: Number(opts.volume),
    });
    return crypto_1.default.createHash("sha256").update(payload).digest("hex");
}
