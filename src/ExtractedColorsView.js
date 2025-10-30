import React from 'react';

const ExtractedColorsView = ({ colors }) => {
  console.log("ExtractedColorsViewUpdate");
  if (!colors || colors.length === 0) {
    return null;
  }

  return (
    <div className="p-4 bg-secondary rounded flex-grow-1 d-flex flex-column">
      <h2 className="h4">抽出された色</h2>
      <div className="flex-grow-1" style={{ overflowY: 'auto' }}>
        <div className="d-flex flex-wrap justify-content-center">
          {colors.map((color, index) => (
            <div
              key={index}
              className="rounded-circle m-2 shadow"
              style={{
                backgroundColor: `rgb(${color})`,
                width: '60px',
                height: '60px',
                border: '2px solid #fff',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default ExtractedColorsView;