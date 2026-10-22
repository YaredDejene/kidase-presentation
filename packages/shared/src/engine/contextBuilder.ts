import type { Presentation } from "../domain/entities/Presentation";
import type { Slide } from "../domain/entities/Slide";
import type { Variable } from "../domain/entities/Variable";
import type { AppSettings } from "../domain/entities/AppSettings";
import type { Gitsawe } from "../domain/entities/Gitsawe";
import type { RuleDefinition } from "../domain/entities/RuleDefinition";
import { RuleContext, RuleEntry } from "./types";
import { RuleEngine } from "./engine";

import {
  getHolidaysForYear,
  HolidayTags,
  toEC,
  toGC,
} from "kenat";

/** Local engine instance for evaluating gitsawe selection rules */
const localEngine = new RuleEngine();

/**
 * Ethiopian Orthodox fasting seasons, expressed in the rule DSL so it stays
 * identical to what a DisplayRule could say. Exposed as meta.isFastingSeason.
 *  - Wednesdays and Fridays outside Easter to Pentecost, except Gena and Timket
 *  - Advent fast: Hidar 15 to Tahsas 29, excluding Gena
 *  - Gahad: the day before Timket
 *  - Nineveh: three days from its start
 *  - Great Lent: Abiy Tsome up to (not including) Fasika
 *  - Apostles' fast: the day after Pentecost until Hamle 5
 *  - Filseta: Nehase 1 to 16
 */
export const FASTING_SEASON_RULE: RuleEntry = {
  id: "fasting-season",
  when: {
    $or: [
      { $and: [
        { "meta.dayOfWeek": { $in: ["Wed", "Fri"] } },
        { $not: { "meta.date": { $between: ["$ref:meta.holidays.fasika", "$ref:meta.holidays.paraclete"] } } },
        { $not: { "meta.date": { $in: ["$ref:meta.holidays.gena", "$ref:meta.holidays.timket"] } } },
      ] },
      { $and: [
        { "meta.ethMonthDay": { $between: ["03-15", "04-29"] } },
        { $not: { "meta.date": { $eq: "$ref:meta.holidays.gena" } } },
      ] },
      { $diff: { from: "$ref:meta.date", to: "$ref:meta.holidays.timket", unit: "days", $eq: 1 } },
      { $diff: { from: "$ref:meta.holidays.nineveh", to: "$ref:meta.date", unit: "days", $between: [0, 2] } },
      { $and: [
        { "meta.date": { $between: ["$ref:meta.holidays.abiyTsome", "$ref:meta.holidays.fasika"] } },
        { $not: { "meta.date": { $eq: "$ref:meta.holidays.fasika" } } },
      ] },
      { $and: [
        { $diff: { from: "$ref:meta.holidays.paraclete", to: "$ref:meta.date", unit: "days", $gte: 1 } },
        { "meta.ethMonthDay": { $between: ["01-01", "11-05"] } },
      ] },
      { "meta.ethMonthDay": { $between: ["12-01", "12-16"] } },
    ],
  } as RuleEntry["when"],
  then: {},
  otherwise: {},
};

export interface BuildContextArgs {
  presentation?: Presentation | null;
  slide?: Slide | null;
  variables?: Variable[];
  appSettings?: AppSettings | null;
  gitsawes?: Gitsawe[];
  gitsaweRules?: RuleDefinition[];
  overrideDate?: Date;
  extra?: Record<string, unknown>;
}

export function buildContext(args: BuildContextArgs): RuleContext {
  const vars: Record<string, string> = {};
  if (args.variables) {
    for (const v of args.variables) {
      // Store by clean name (without braces) and raw name
      vars[v.name] = v.value;
      const clean = v.name.replace(/^\{\{|\}\}$/g, "");
      if (clean !== v.name) {
        vars[clean] = v.value;
      }
    }
  }

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const pad = (n: number) => n.toString().padStart(2, "0");

  // Gregorian date info
  const now = args.overrideDate ?? new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = now.getDate();

  // Ethiopian date info
  const ethDate = toEC(year, month, day);
  const holidaysInEth = getHolidaysForYear(ethDate.year, { filter: [HolidayTags.CHRISTIAN] });

  // Convert holidays to GC date strings for easier use in rules
  const holidaysObj = holidaysInEth.reduce((acc, h) => {
    const gcDate = toGC(h.ethiopian.year, h.ethiopian.month, h.ethiopian.day);
    const gcDateStr = `${gcDate.year}-${pad(gcDate.month)}-${pad(gcDate.day)}`; // "YYYY-MM-DD"
    acc[h.key] = gcDateStr;
    return acc;
  }, {} as Record<string, string>);

  // Additional holidays to be added to holidaysObj
  // 1. tsige (ጽጌ) - Month: 01, Day: 26 in Ethiopian calendar
  // 2. quskuam (ቁስቋም) - Month: 03, Day: 06 in Ethiopian calendar
  // 3. filseta (ፍልሰታ) - Month: 12, Day: 01 in Ethiopian calendar
  // 4. kiremt (ክረምት) - Month: 10, Day: 26 in Ethiopian calendar
  const tsigeGC = toGC(ethDate.year, 1, 26);
  holidaysObj["tsige"] = `${tsigeGC.year}-${pad(tsigeGC.month)}-${pad(tsigeGC.day)}`;
  const quskuamGC = toGC(ethDate.year, 3, 6);
  holidaysObj["quskuam"] = `${quskuamGC.year}-${pad(quskuamGC.month)}-${pad(quskuamGC.day)}`;
  const filsetaGC = toGC(ethDate.year, 12, 1);
  holidaysObj["filseta"] = `${filsetaGC.year}-${pad(filsetaGC.month)}-${pad(filsetaGC.day)}`;
  const kiremtGC = toGC(ethDate.year, 10, 26);
  holidaysObj["kiremt"] = `${kiremtGC.year}-${pad(kiremtGC.month)}-${pad(kiremtGC.day)}`;


  const meta: Record<string, unknown> = {
    now: now.toISOString(),
    date: `${year}-${pad(month)}-${pad(day)}`,
    year: year,
    month: month,
    monthName: monthNames[now.getMonth()],
    day: day,
    dayOfWeek: dayNames[now.getDay()],
    ethDate: `${ethDate.year}-${pad(ethDate.month)}-${pad(ethDate.day)}`,
    ethYear: ethDate.year,
    ethMonth: ethDate.month,
    ethDay: ethDate.day,
    ethMonthDay: `${pad(ethDate.month)}-${pad(ethDate.day)}`,
    holidays: holidaysObj,
    ...args.extra,
  };
  meta.isFastingSeason = localEngine.evaluateRule(FASTING_SEASON_RULE, {
    presentation: {}, slide: {}, vars: {}, settings: {}, meta,
  }).matched;

  // Resolve the current Gitsawe based on selection rules and priority
  const matched = getCurrentGitsawe(
    args.gitsawes ?? [],
    args.gitsaweRules ?? [],
    meta,
  );
  if (matched) {
    meta.gitsawe = toRecord(matched);
  }

  return {
    presentation: args.presentation ? toRecord(args.presentation) : {},
    slide: args.slide ? toRecord(args.slide) : {},
    vars,
    settings: args.appSettings ? toRecord(args.appSettings) : {},
    meta,
  };
}

/**
 * Walk Gitsawe records by priority (1 → 2 → 3).
 * For each record, evaluate its selection rules against the meta object.
 * Return the first record whose rule matches.
 */
function getCurrentGitsawe(
  gitsawes: Gitsawe[],
  gitsaweRules: RuleDefinition[],
  meta: Record<string, unknown>,
): Gitsawe | null {
  if (gitsawes.length === 0) return null;

  // Group enabled rules by gitsaweId for fast lookup
  const rulesByGitsaweId = new Map<string, RuleDefinition[]>();
  for (const rule of gitsaweRules) {
    if (!rule.isEnabled || !rule.gitsaweId) continue;
    const existing = rulesByGitsaweId.get(rule.gitsaweId);
    if (existing) {
      existing.push(rule);
    } else {
      rulesByGitsaweId.set(rule.gitsaweId, [rule]);
    }
  }

  // Minimal context for rule evaluation — selection rules only reference meta
  const evalContext: RuleContext = {
    presentation: {},
    slide: {},
    vars: {},
    settings: {},
    meta,
  };

  // Sort by priority ascending (lowest number = highest priority)
  const sorted = [...gitsawes].sort((a, b) => a.priority - b.priority);

  for (const record of sorted) {
    const rules = rulesByGitsaweId.get(record.id);
    if (!rules || rules.length === 0) continue;

    for (const ruleDef of rules) {
      try {
        const ruleEntry: RuleEntry = JSON.parse(ruleDef.ruleJson);
        const result = localEngine.evaluateRule(ruleEntry, evalContext);
        if (result.matched) {
          return record;
        }
      } catch (err) {
        console.warn(`Skipping malformed rule "${ruleDef.name}":`, err);
      }
    }
  }

  return null;
}

/** Shallow-convert a typed entity to Record<string, unknown> */
function toRecord(obj: object): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    result[key] = value;
  }
  return result;
}
