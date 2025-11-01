import React, { useMemo } from 'react';
import { calculateBeautyDetails } from './utils/beautyCalculator';
import { colorDistance } from './colorutil.js';

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
    <div className="mt-4 p-4 rounded h-100 d-flex flex-column" style={{ background: 'linear-gradient(135deg, #2c3e50, #3498db)' }}>
      <h2 className="h4 text-center mb-3 text-white" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>色の提案</h2>
      <div className="container flex-grow-1 overflow-auto">
        <div className="row g-3">
          {suggestions.filter((suggestion, index, self) => {
            if (index === 0) return true;
            const prevSuggestion = self[index - 1];
            const distance = colorDistance(suggestion.rgb, prevSuggestion.rgb);
            return distance > 15; // しきい値
          }).map((suggestion) => (
            <div key={suggestion.name} className="col-2">
              <div
                className="position-relative"
                style={{
                  width: '100%',
                  paddingBottom: '100%',
                  background: `rgb(${suggestion.rgb.join(",")})`,
                  borderRadius: '50%',
                  border: '2px solid rgba(255,255,255,0.8)',
                  boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
                  cursor: 'pointer',
                  transition: 'transform 0.2s, box-shadow 0.2s'
                }}
                title={`新しい美度: ${suggestion.newBeauty.toFixed(3)}`}
              >
                <div
                  className="position-absolute top-50 start-50 translate-middle text-center p-1"
                  style={{
                    color: suggestion.rgb.reduce((a, b) => a + b) > 382 ? '#000' : '#fff',
                    fontWeight: 'bold',
                    textShadow: suggestion.rgb.reduce((a, b) => a + b) > 382 
                      ? '0 0 4px rgba(255,255,255,0.5)' 
                      : '0 0 4px rgba(0,0,0,0.5)',

                    borderRadius: '4px',
                
                    minWidth: '70%'
                  }}
                >
                  {suggestion.difference > 0 ? '+' : ''}{suggestion.difference.toFixed(3)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ColorSuggest;