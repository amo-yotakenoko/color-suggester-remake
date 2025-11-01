import React, { useMemo } from 'react';
import { calculateBeautyDetails } from './utils/beautyCalculator';

// fallback 代表色
const FALLBACK_COLORS = [
  { name: "白", rgb: [255, 255, 255] },
  { name: "黒", rgb: [0, 0, 0] },
  { name: "赤", rgb: [255, 0, 0] },
  { name: "青", rgb: [0, 0, 255] },
  { name: "緑", rgb: [0, 128, 0] },
];

const ColorSuggest = ({ clusteredColors, munsellColors }) => {
  const currentBeauty = useMemo(() => {
    const result = calculateBeautyDetails(clusteredColors);
    return result ? result.beauty : null;
  }, [clusteredColors]);

  const suggestions = useMemo(() => {
    if (!clusteredColors || !currentBeauty) return [];

    // munsellColors があればその全色を候補として使う（なければフォールバック）
    let sourceColors = FALLBACK_COLORS;
    if (munsellColors && munsellColors.length > 0) {
      sourceColors = munsellColors.map((mc, idx) => ({
        name: mc.hex || `munsell-${idx}`,
        rgb: mc.rgb,
      }));
    }

    return sourceColors.map(color => {
      const newColors = [...clusteredColors, color.rgb];
      const result = calculateBeautyDetails(newColors);
      const newBeauty = result ? result.beauty : 0;
      const difference = newBeauty - currentBeauty;
      return { ...color, newBeauty, difference };
    }).sort((a, b) => b.difference - a.difference);
  }, [clusteredColors, currentBeauty, munsellColors]);

  if (!currentBeauty) return null;

  return (
    <div className="mt-4 p-4 bg-secondary rounded">
      <h2 className="h4 text-center mb-3">色の提案</h2>
      <table className="table table-sm table-striped text-center align-middle">
        <thead>
          <tr>
            <th>色</th>
            <th>サンプル</th>
            <th>新しい美度</th>
            <th>変化量</th>
          </tr>
        </thead>
        <tbody>
          {suggestions.map((suggestion) => (
            <tr key={suggestion.name}>
              <td>{suggestion.name}</td>
              <td>
                <div
                  style={{
                    width: 20,
                    height: 20,
                    background: `rgb(${suggestion.rgb.join(",")})`,
                    margin: "0 auto",
                    border: "1px solid #ccc",
                  }}
                />
              </td>
              <td>{suggestion.newBeauty.toFixed(3)}</td>
              <td style={{ 
                color: suggestion.difference > 0 ? '#98FB98' : 
                       suggestion.difference < 0 ? '#FFA07A' : 'inherit'
              }}>
                {suggestion.difference > 0 ? '+' : ''}{suggestion.difference.toFixed(3)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ColorSuggest;