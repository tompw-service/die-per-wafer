import assert from "node:assert/strict";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { computeDPW, costPerDie, murphyYield, poissonYield } from "../src/index.js";

const input = { diameter: 300, dieW: 5, dieH: 5 };

test("CLI rejects invalid inputs and preserves the documented result", () => {
  const cli = fileURLToPath(new URL("../src/cli.js", import.meta.url));
  const run = (args) => spawnSync(process.execPath, [cli, ...args], { encoding: "utf8" });
  const valid = ["--diameter", "300", "--die", "5x5"];
  const result = run([...valid, "--json"]);
  assert.equal(result.status, 0);
  assert.equal(JSON.parse(result.stdout).gross, 2545);
  for (const args of [
    ["--diameter", "-300", "--die", "5x5"],
    ["--diameter", "300", "--die", "0x5"],
    [...valid, "--scribe", "NaN"], [...valid, "--edge", "-1"],
    [...valid, "--model", "other"], [...valid, "--defect"],
    [...valid, "--waferCost", "-1"], [...valid, "--unknown"],
  ]) assert.notEqual(run(args).status, 0);
});

test("documented 300 mm reference result", () => {
  const r = computeDPW({ ...input, defect: 0.1 });
  assert.equal(r.gross, 2545);
  assert.equal(r.net, 2482);
  assert.ok(Math.abs(r.yieldPct - 97.536062) < 0.001);
});

test("zero defects preserve the gross count", () => {
  const r = computeDPW(input);
  assert.equal(r.gross, r.net);
  assert.equal(r.yieldPct, 100);
});

test("scribe and edge exclusion do not increase die count", () => {
  const base = computeDPW(input);
  assert.ok(computeDPW({ ...input, scribeX: 0.2, scribeY: 0.2 }).gross < base.gross);
  assert.ok(computeDPW({ ...input, edge: 5 }).gross < base.gross);
  assert.equal(computeDPW({ ...input, edge: 150 }).gross, 0);
});

test("yield models and costs retain their units", () => {
  assert.equal(murphyYield(0.25, 0), 1);
  assert.equal(poissonYield(0.25, 0.1), Math.exp(-0.025));
  assert.equal(costPerDie(12000, 2000), 6);
  assert.equal(costPerDie(12000, 0), Infinity);
});

test("representative planning grid has bounded outputs", () => {
  for (const diameter of [100, 150, 200, 300]) {
    for (const die of [1, 5, 10, 20]) {
      for (const model of ["murphy", "poisson"]) {
        const r = computeDPW({ diameter, dieW: die, dieH: die, defect: 0.2, model });
        assert.ok(r.gross >= 0 && r.gross <= r.max);
        assert.ok(r.net >= 0 && r.net <= r.gross);
        assert.ok(r.util >= 0 && r.util <= 100);
      }
    }
  }
});
