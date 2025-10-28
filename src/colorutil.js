export function colorDistance(c1, c2) {
  // 単純なユークリッド距離（RGB空間）
  const dr = c1[0] - c2[0];
  const dg = c1[1] - c2[1];
  const db = c1[2] - c2[2];
  return Math.sqrt(dr * dr + dg * dg + db * db);
}
