/**
 * die-per-wafer — dies-per-wafer (DPW) and yield estimation, zero dependencies.
 *
 * Pure functions, no framework, no network. Everything is millimetres and
 * defects per cm² so it can be dropped into a script, a spreadsheet pipeline
 * or a web page without translation.
 *
 * MIT licensed. Maintained by TOMPW Service.
 */

/**
 * @typedef {Object} DPWInput
 * @property {number} diameter  Wafer diameter in mm (100 / 150 / 200 / 300).
 * @property {number} dieW      Die width in mm.
 * @property {number} dieH      Die height in mm.
 * @property {number} [scribeX] Scribe lane width in mm (default 0.1).
 * @property {number} [scribeY] Scribe lane height in mm (default 0.1).
 * @property {number} [edge]    Edge exclusion in mm (default 3).
 * @property {number} [defect]  Defect density D0 in defects per cm² (default 0).
 * @property {"murphy"|"poisson"} [model] Yield model (default "murphy").
 */

/**
 * @typedef {Object} DPWResult
 * @property {number} gross     Gross dies per wafer after edge exclusion.
 * @property {number} max       Theoretical maximum (wafer area / pitch area).
 * @property {number} util      Estimated die area / full wafer area, percent.
 * @property {number} yieldPct  Modelled yield, percent.
 * @property {number} net       Net good dies (gross x yield), rounded.
 * @property {number} dieArea   Die area in mm².
 * @property {number} waferArea Full wafer area in mm².
 * @property {number} Reff      Effective radius after edge exclusion, mm.
 * @property {number} pitchX    Die pitch in X including scribe, mm.
 * @property {number} pitchY    Die pitch in Y including scribe, mm.
 * @property {number} pitchArea Pitch area in mm².
 */

/**
 * Dies per wafer with a perimeter correction.
 *
 * The naive estimate is floor(effective area / pitch area). Real layouts lose
 * dies at the wafer edge because a die cannot straddle the usable-radius
 * boundary, so a perimeter term proportional to the effective circumference is
 * subtracted. This is the same estimator used by the TOMPW online calculator.
 *
 * @param {DPWInput} p
 * @returns {DPWResult}
 */
export function computeDPW(p) {
  const scribeX = p.scribeX ?? 0.1;
  const scribeY = p.scribeY ?? 0.1;
  const edge = p.edge ?? 3;
  const defect = p.defect ?? 0;
  const model = p.model ?? "murphy";

  const R = p.diameter / 2;
  const Reff = Math.max(0, R - edge);
  const pitchX = p.dieW + scribeX;
  const pitchY = p.dieH + scribeY;
  const dieArea = p.dieW * p.dieH;
  const pitchArea = pitchX * pitchY;
  const waferArea = Math.PI * R * R;

  if (pitchArea <= 0 || Reff <= 0) {
    return {
      gross: 0,
      max: 0,
      util: 0,
      yieldPct: 100,
      net: 0,
      dieArea,
      waferArea,
      Reff,
      pitchX,
      pitchY,
      pitchArea,
    };
  }

  const max = Math.floor(waferArea / pitchArea);
  const gross = Math.max(
    0,
    Math.floor(
      (Math.PI * Reff * Reff) / pitchArea -
        (Math.PI * Reff) / Math.sqrt(2 * pitchArea),
    ),
  );
  const util = waferArea > 0 ? ((gross * dieArea) / waferArea) * 100 : 0;

  const areaCm2 = dieArea / 100;
  let yld = 1;
  if (defect > 0 && areaCm2 > 0) {
    yld = model === "poisson" ? poissonYield(areaCm2, defect) : murphyYield(areaCm2, defect);
  }

  return {
    gross,
    max,
    util,
    yieldPct: yld * 100,
    net: Math.round(gross * yld),
    dieArea,
    waferArea,
    Reff,
    pitchX,
    pitchY,
    pitchArea,
  };
}

/**
 * Murphy yield model: Y = ((1 - e^(-D0*A)) / (D0*A))^2.
 * @param {number} areaCm2 Die area in cm².
 * @param {number} d0      Defect density in defects per cm².
 * @returns {number} Yield as a fraction (0..1).
 */
export function murphyYield(areaCm2, d0) {
  if (d0 <= 0 || areaCm2 <= 0) return 1;
  const x = d0 * areaCm2;
  return Math.pow((1 - Math.exp(-x)) / x, 2);
}

/**
 * Poisson yield model: Y = e^(-D0*A).
 * @param {number} areaCm2 Die area in cm².
 * @param {number} d0      Defect density in defects per cm².
 * @returns {number} Yield as a fraction (0..1).
 */
export function poissonYield(areaCm2, d0) {
  if (d0 <= 0 || areaCm2 <= 0) return 1;
  return Math.exp(-d0 * areaCm2);
}

/**
 * Cost per good die.
 * @param {number} waferCost Cost per wafer.
 * @param {number} netDies   Net good dies per wafer.
 * @returns {number} Cost per good die (Infinity if there are no good dies).
 */
export function costPerDie(waferCost, netDies) {
  if (!netDies || netDies <= 0) return Infinity;
  return waferCost / netDies;
}

/** Common wafer diameters with illustrative cost assumptions, not market quotes. */
export const WAFER_PRESETS = [
  { label: '100 mm (4")', diameter: 100, typicalCost: 800 },
  { label: '150 mm (6")', diameter: 150, typicalCost: 1800 },
  { label: '200 mm (8")', diameter: 200, typicalCost: 3500 },
  { label: '300 mm (12")', diameter: 300, typicalCost: 12000 },
];

export default { computeDPW, murphyYield, poissonYield, costPerDie, WAFER_PRESETS };
