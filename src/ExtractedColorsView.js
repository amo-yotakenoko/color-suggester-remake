import React from 'react';

const ExtractedColorsView = ({ colors }) => {
  console.log("ExtractedColorsViewUpdate");

  if (!colors || colors.length === 0) {
    return null;
  }

  return (
    <div
      className="h-100 position-relative"
      style={{
        overflow: 'hidden',
        marginTop: '-20px',  // マンセル色立体に少し重なるように
        zIndex: 10,  // マンセル色立体の上に表示
      }}
    >
      <div
        className="h-100 d-flex justify-content-center align-items-start"
        style={{
          overflowY: 'auto',
        }}
      >
        <div className="d-flex flex-wrap justify-content-center">
          {colors.map((color, index) => (
            <div
              key={index}
              className="position-relative m-1"
              style={{
                width: '30px',  // サイズを少し小さく
                height: '30px',
              }}
            >
              <div
                className="rounded-circle w-100 h-100"
                style={{
                  backgroundColor: `rgb(${color})`,
                  border: '2px solid #fff',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                }}
                title={`RGB(${color.join(', ')})`}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ExtractedColorsView;
