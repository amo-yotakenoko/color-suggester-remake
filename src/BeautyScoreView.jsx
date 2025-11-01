import React from "react";
import "./BeautyScoreView.css";

const BeautyScoreView = ({ beautyScore }) => {
  if (!beautyScore)
    return (
      <div className="mt-4 p-4 bg-secondary rounded text-center">
        <h2 className="h4">美度</h2>
        <p className="display-4">―</p>
        <p className="text-muted">2色以上必要です</p>
      </div>
    );

  const { beauty, complexity, pairDetails } = beautyScore;

  return (
    <div className="mt-4 p-4 bg-secondary rounded">
      <h2 className="h4 text-center mb-2">美度</h2>
      <p className="display-4 text-center">{beauty.toFixed(3)}</p>
      <p className="text-muted text-center mb-4">
        複雑さ: {complexity.toFixed(2)}（色数＋差分カウント）
      </p>

      <table className="table table-sm table-striped text-center align-middle">
        <thead>
          <tr>
            <th>#</th>
            <th>色1</th>
            <th>色2</th>
            <th>色相差</th>
            <th>評価</th>
            <th>明度差</th>
            <th>評価</th>
            <th>彩度差</th>
            <th>評価</th>
            <th>秩序</th>
          </tr>
        </thead>
        <tbody>
          {pairDetails.map((p, idx) => (
            <tr key={idx}>
              <td>{idx + 1}</td>
              <td>
                <div
                  style={{
                    width: 20,
                    height: 20,
                    background: `rgb(${p.color1.join(",")})`,
                    margin: "0 auto",
                    border: "1px solid #ccc",
                  }}
                />
              </td>
              <td>
                <div
                  style={{
                    width: 20,
                    height: 20,
                    background: `rgb(${p.color2.join(",")})`,
                    margin: "0 auto",
                    border: "1px solid #ccc",
                  }}
                />
              </td>
              <td>{p.Hdifferent.toFixed(1)}</td>
              <td>{p.Heval}</td>
              <td>{p.Vdifferent.toFixed(1)}</td>
              <td>{p.Veval}</td>
              <td>{p.Cdifferent.toFixed(1)}</td>
              <td>{p.Ceval}</td>
              <td>{p.order.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default BeautyScoreView;
