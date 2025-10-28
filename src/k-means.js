export function extractDominantColorsKMeans(imageData, k = 5, maxIterations = 10) {
  const data = imageData.data;
  const pixels = [];

  // 1. 画像のピクセルを RGB 配列に変換
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];
    if (a >= 255) pixels.push([r, g, b]);
  }

  if (pixels.length === 0) return [];

  // 2. 初期クラスタ中心をランダムに選ぶ
  const centroids = [];
  for (let i = 0; i < k; i++) {
    centroids.push(pixels[Math.floor(Math.random() * pixels.length)].slice());
  }

  let assignments = new Array(pixels.length).fill(0);

  for (let iter = 0; iter < maxIterations; iter++) {
    // 3. 各ピクセルを最近傍のクラスタに割り当て
    for (let i = 0; i < pixels.length; i++) {
      let minDist = Infinity;
      let cluster = 0;
      for (let j = 0; j < k; j++) {
        const dist = euclideanDist(pixels[i], centroids[j]);
        if (dist < minDist) {
          minDist = dist;
          cluster = j;
        }
      }
      assignments[i] = cluster;
    }

    // 4. クラスタ中心を再計算
    const sums = Array(k).fill(null).map(() => [0, 0, 0]);
    const counts = Array(k).fill(0);

    for (let i = 0; i < pixels.length; i++) {
      const cluster = assignments[i];
      sums[cluster][0] += pixels[i][0];
      sums[cluster][1] += pixels[i][1];
      sums[cluster][2] += pixels[i][2];
      counts[cluster]++;
    }

    for (let j = 0; j < k; j++) {
      if (counts[j] > 0) {
        centroids[j][0] = Math.round(sums[j][0] / counts[j]);
        centroids[j][1] = Math.round(sums[j][1] / counts[j]);
        centroids[j][2] = Math.round(sums[j][2] / counts[j]);
      }
    }
  }

  // 5. RGB を文字列に変換して返す
  return centroids.map(c => `${c[0]},${c[1]},${c[2]}`);
}

// ユークリッド距離
function euclideanDist(a, b) {
  return Math.sqrt(
    (a[0] - b[0]) ** 2 +
    (a[1] - b[1]) ** 2 +
    (a[2] - b[2]) ** 2
  );
}