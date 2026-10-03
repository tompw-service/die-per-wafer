# die-per-wafer

Zero-dependency **dies-per-wafer (DPW)** and yield estimator for ASIC, MPW and wafer-cost planning.

Estimate gross dies and modelled good dies for a standalone wafer layout, then compare cost assumptions. This does not predict delivered MPW samples or allocate shared shuttle costs.

- No dependencies, no build step, no network calls.
- Works in Node 18+, browsers, or any bundler.
- Murphy and Poisson yield models, scribe lanes and edge exclusion.
- Same estimator that powers the [online die-per-wafer calculator](https://www.tompwservice.com/tools/die-per-wafer).

## Run From Source

This project has not been published to npm. Use this source checkout, not an
unverified package with the same name. Inputs must be finite, with positive
diameter and die dimensions and non-negative scribe, edge and defect values.

```bash
node src/cli.js --diameter 300 --die 5x5 --defect 0.1
node --test test/*.test.js
```

## Library usage

```js
import { computeDPW, costPerDie, murphyYield } from "./src/index.js";

const r = computeDPW({
  diameter: 300,   // mm
  dieW: 5,         // mm
  dieH: 5,         // mm
  scribeX: 0.1,    // mm (default 0.1)
  scribeY: 0.1,    // mm (default 0.1)
  edge: 3,         // mm edge exclusion (default 3)
  defect: 0.1,     // defects per cm² (default 0 -> yield 100%)
  model: "murphy", // "murphy" | "poisson"
});

console.log(r.gross);     // gross dies per wafer
console.log(r.net);       // net good dies
console.log(r.util);      // % of wafer area used by dies
console.log(r.yieldPct);  // % modelled yield
console.log(costPerDie(12000, r.net)); // cost per good die
```

## CLI

```
node src/cli.js --diameter 300 --die 5x5 --scribe 0.1 --edge 3 --defect 0.1 [--waferCost 12000] [--json]
```

Example output:

```
Wafer            300 mm  (300 mm (12"))
Die              5 x 5 mm  (25.00 mm²)
Pitch            5.100 x 5.100 mm
Edge exclusion   147.00 mm effective radius
Gross DPW        2545
Utilisation      90.0 %
Yield (Murphy)   97.5 %
Net good dies    2482
Cost per die     4.83 per good die
```

## The model

**Gross dies per wafer.** Start from the usable area inside the edge exclusion, then subtract a perimeter term, because a die cannot straddle the usable-radius boundary:

```
R_eff   = diameter / 2 - edge
pitch   = (dieW + scribeX) x (dieH + scribeY)
gross   = floor( pi * R_eff² / pitch_area  -  pi * R_eff / sqrt(2 * pitch_area) )
```

**Yield.** Two standard models, both driven by die area `A` in cm² and defect density `D0`:

```
Murphy :  Y = ((1 - e^(-D0*A)) / (D0*A))²
Poisson:  Y = e^(-D0*A)
```

Both are simplified planning models. Select assumptions supported by the process data; neither establishes the actual yield of a particular foundry or MPW run.

**Net good dies** = `round(gross * Y)`, and cost per good die = `waferCost / netGoodDies`.

## Accuracy note

This is a planning estimator, not a layout-verified die count. It does not model the wafer notch or flat clearance, reticle shot layout, or partially printed dies at the edge. The approximation can overestimate usable dies. Confirm final numbers with the foundry's DPW report before committing volume economics. Preset costs and example inputs are illustrative budget assumptions, not current market quotes.

## Related tools

- [Die-per-wafer calculator](https://www.tompwservice.com/tools/die-per-wafer) — browser version of this estimator
- [MPW cost sharing calculator](https://www.tompwservice.com/tools/mpw-cost-sharing) — split a shared shuttle wafer cost across participants
- [MPW shuttle schedule](https://www.tompwservice.com/mpw-schedule) — published foundry shuttle calendars (UMC, X-FAB, GlobalFoundries, IHP)
- [Semiconductor cost ranges](https://www.tompwservice.com/pricing) — industry reference ranges for MPW seats, mask sets, wafers, packaging, test and IP

## Contributing

Issues and pull requests using synthetic examples are welcome. Share real comparison summaries only with explicit publication permission and after anonymization. Never upload raw wafer maps, customer data, PDK material, contracts or confidential foundry information.

## License

MIT — see [LICENSE](./LICENSE).
