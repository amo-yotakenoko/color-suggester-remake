import React from 'react';

const ExtractedColorsView = ({ colors }) => {
  console.log("ExtractedColorsViewUpdate");

  if (!colors || colors.length === 0) {
    return null;
  }

  return (
    <div
      className="bg-secondary rounded shadow-lg p-3 d-flex flex-column"
      style={{
        flex: '1 1 auto',
        maxHeight: '40vh', // 高さを画面の40%までに制限
        overflow: 'hidden',
      }}
    >
      <div className="mb-2 flex-shrink-0 text-center">
        <h2 className="h5 mb-0">抽出された色</h2>
      </div>
      <div
        className="flex-grow-1"
        style={{
          overflowY: 'auto',
          paddingRight: '4px',
        }}
      >
        <div className="d-flex flex-wrap justify-content-center">
          {colors.map((color, index) => (
            <div
              key={index}
              className="rounded-circle m-1 shadow-sm"
              style={{
                backgroundColor: `rgb(${color})`,
                width: '40px',
                height: '40px',
                border: '1px solid rgba(255,255,255,0.8)',
              }}
              title={`RGB(${color.join(', ')})`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default ExtractedColorsView;
