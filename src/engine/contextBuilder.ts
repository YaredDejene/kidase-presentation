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
      } catch {
        // Skip malformed rules
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
