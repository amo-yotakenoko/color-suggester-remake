// --- RGB → HVC変換（簡易版、元のXYZtoHVCの代用） ---
function rgbToHVC([r, g, b]) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  // Hue
  let H = 0;
  if (delta > 0) {
    if (max === r) H = ((g - b) / delta) % 6;
    else if (max === g) H = (b - r) / delta + 2;
    else H = (r - g) / delta + 4;
    H *= 60;
    if (H < 0) H += 360;
  }

  // Value (明度)
  const V = max * 10; // 0〜10にスケール
  // Chroma (彩度)
  const C = delta * 10;

  return { H, V, C };
}

// --- 美度計算ロジック ---
export function calculateBeautyDetails(clusteredColors) {
  if (!clusteredColors || clusteredColors.length < 2) return null;

  const coloritems = clusteredColors.map(rgb => ({
    rgb,
    HVC: rgbToHVC(rgb),
  }));

  let HdifferentCount = 0;
  let VdifferentCount = 0;
  let CdifferentCount = 0;
  let ordersum = 0;

  const pairDetails = [];

  for (let i = 0; i < coloritems.length; i++) {
    for (let j = i + 1; j < coloritems.length; j++) {
      const { HVC: HVC1 } = coloritems[i];
      const { HVC: HVC2 } = coloritems[j];

      let Hdifferent = Math.abs(HVC1.H - HVC2.H);
      if (Hdifferent > 180) Hdifferent = 360 - Hdifferent;

      // === 色相差評価 ===
      let Hpoint = 0;
      let Heval = "";
      if (Hdifferent < 1) {
        Heval = "同一調和";
        Hpoint = 1.5;
      } else if (Hdifferent < 7) {
        Heval = "第1の曖昧";
        Hpoint = 0;
      } else if (Hdifferent < 12) {
        Heval = "類似調和";
        Hpoint = 1.1;
      } else if (Hdifferent < 28) {
        Heval = "第2の曖昧";
        Hpoint = 0.65;
      } else {
        Heval = "対比調和";
        Hpoint = 1.7;
      }
      if (HVC1.C < 1 || HVC2.C < 1) {
        Heval = "灰色";
        Hpoint = 1.0;
      }

      const Vdifferent = Math.abs(HVC1.V - HVC2.V);
      const Cdifferent = Math.abs(HVC1.C - HVC2.C);

      // === 明度・彩度差評価 ===
      let Vpoint = 0;
      let Cpoint = 0;
      let Veval = "";
      let Ceval = "";

      const calcDist = (v, c, sv, sc) =>
        Math.sqrt(Math.pow(v / sv, 2) + Math.pow(c / sc, 2));

      if (calcDist(Vdifferent, Cdifferent, 0.25, 0.5) < 1) {
        Veval = "同一調和";
        Ceval = "同一調和";
        Vpoint = -1.3;
        Cpoint = 0.8;
      } else if (calcDist(Vdifferent, Cdifferent, 0.5, 3) < 1) {
        Veval = "第1の曖昧";
        Ceval = "第1の曖昧";
        Vpoint = -1.0;
        Cpoint = 0;
      } else if (calcDist(Vdifferent, Cdifferent, 1.5, 5) < 1) {
        Veval = "類似調和";
        Ceval = "類似調和";
        Vpoint = 0.7;
        Cpoint = 0.1;
      } else if (calcDist(Vdifferent, Cdifferent, 2.5, 7.5) < 1) {
        Veval = "第2の曖昧";
        Ceval = "第2の曖昧";
        Vpoint = -0.2;
        Cpoint = 0;
      } else {
        Veval = "対比調和";
        Ceval = "対比調和";
        Vpoint = 3.7;
        Cpoint = 0.4;
      }

      if (Vdifferent > 9) {
        Veval = "眩輝";
        Vpoint = -2.0;
      }

      const order = Hpoint + Vpoint + Cpoint;
      ordersum += order;

      if (Hdifferent > 2) HdifferentCount++;
      if (Vdifferent > 2) VdifferentCount++;
      if (Cdifferent > 2) CdifferentCount++;

      pairDetails.push({
        i,
        j,
        color1: coloritems[i].rgb,
        color2: coloritems[j].rgb,
        Hdifferent,
        Heval,
        Hpoint,
        Vdifferent,
        Veval,
        Vpoint,
        Cdifferent,
        Ceval,
        Cpoint,
        order,
      });
    }
  }

  const complexity =
    coloritems.length + HdifferentCount + VdifferentCount + CdifferentCount;
  const beauty = ordersum / complexity;

  return { beauty, complexity, pairDetails };
}


function beautyToPoint(x) {
  const a = 0.5;
  return 100 * x / (x + a);
  

}
export default beautyToPoint;