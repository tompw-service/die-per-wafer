#!/usr/bin/env node
/**
 * Command-line front end for the DPW estimator.
 *
 *   node src/cli.js --diameter 300 --die 5x5 --scribe 0.1 --edge 3 --defect 0.1
 *   node src/cli.js --diameter 200 --die 12.24x15.24 --defect 0.05 --json
 */

import { computeDPW, costPerDie, WAFER_PRESETS } from "./index.js";

function parseArgs(argv) {
  const out = {};
  const valued = new Set(["diameter", "d", "die", "scribe", "edge", "defect", "model", "waferCost"]);
  const flags = new Set(["json", "help", "h"]);
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    const key = token.slice(2);
    if (!token.startsWith("--") || (!valued.has(key) && !flags.has(key))) {
      console.error(`Error: unknown argument ${token}`);
      process.exit(1);
    }
    const next = argv[i + 1];
    if (flags.has(key)) {
      out[key] = true;
    } else {
      if (next === undefined || next.startsWith("--")) {
        console.error(`Error: missing value for ${token}`);
        process.exit(1);
      }
      out[key] = next;
      i += 1;
    }
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));

if (args.help || args.h) {
  console.log(`Usage: die-per-wafer --diameter <mm> --die <WxH> [options]

Options:
  --diameter   Wafer diameter in mm (100 / 150 / 200 / 300)   [required]
  --die        Die size in mm, e.g. 5x5 or 12.24x15.24        [required]
  --scribe     Scribe lane in mm (both axes)                 [default 0.1]
  --edge       Edge exclusion in mm                          [default 3]
  --defect     Defect density D0 in defects/cm²              [default 0]
  --model      murphy | poisson                              [default murphy]
  --waferCost  Wafer cost, adds cost per good die
  --json       Emit raw JSON
  --help       This message`);
  process.exit(0);
}

const diameter = Number(args.diameter ?? args.d);
const die = String(args.die ?? "");
const [dieW, dieH] = die.split(/[x*]/i).map(Number);

if (!Number.isFinite(diameter) || !Number.isFinite(dieW) || !Number.isFinite(dieH)) {
  console.error("Error: --diameter and --die are required, e.g. --diameter 300 --die 5x5");
  process.exit(1);
}

const scribe = Number(args.scribe ?? 0.1);
const edge = Number(args.edge ?? 3);
const defect = Number(args.defect ?? 0);
const waferCost = args.waferCost === undefined ? null : Number(args.waferCost);
if (die.split(/[x*]/i).length !== 2 || [diameter, dieW, dieH].some((n) => n <= 0) ||
    [scribe, edge, defect].some((n) => !Number.isFinite(n) || n < 0) ||
    (waferCost !== null && (!Number.isFinite(waferCost) || waferCost < 0)) ||
    (args.model !== undefined && !["murphy", "poisson"].includes(args.model))) {
  console.error("Error: use positive dimensions, finite non-negative cost/scribe/edge/defect, and murphy or poisson.");
  process.exit(1);
}
const result = computeDPW({
  diameter,
  dieW,
  dieH,
  scribeX: scribe,
  scribeY: scribe,
  edge,
  defect,
  model: args.model === "poisson" ? "poisson" : "murphy",
});

if (args.json) {
  console.log(JSON.stringify(result, null, 2));
  process.exit(0);
}

const preset = WAFER_PRESETS.find((p) => p.diameter === diameter);

console.log(`Wafer            ${diameter} mm${preset ? `  (${preset.label})` : ""}`);
console.log(`Die              ${dieW} x ${dieH} mm  (${result.dieArea.toFixed(2)} mm²)`);
console.log(`Pitch            ${result.pitchX.toFixed(3)} x ${result.pitchY.toFixed(3)} mm`);
console.log(`Edge exclusion   ${result.Reff.toFixed(2)} mm effective radius`);
console.log(`Gross DPW        ${result.gross}`);
console.log(`Utilisation      ${result.util.toFixed(1)} %`);
if (Number(args.defect ?? 0) > 0) {
  console.log(`Yield (${args.model === "poisson" ? "Poisson" : "Murphy"})   ${result.yieldPct.toFixed(1)} %`);
}
console.log(`Net good dies    ${result.net}`);
if (waferCost !== null) {
  console.log(`Cost per die     ${costPerDie(waferCost, result.net).toFixed(2)} per good die`);
}
