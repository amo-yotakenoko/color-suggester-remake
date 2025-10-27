import { useRef, useState } from "react";
import ImageSegmentClothes from "./imageSegmentClothes";

export default function App() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [maskAlpha, setMaskAlpha] = useState(0.6); // Default mask alpha
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.1); // Default confidence threshold

  const handleMaskAlphaChange = (e) => {
    setMaskAlpha(parseFloat(e.target.value));
  };

  const handleConfidenceThresholdChange = (e) => {
    setConfidenceThreshold(parseFloat(e.target.value));
  };

  return (
    <div>
      <video
        ref={videoRef}
        width={640}
        height={480}
        style={{ display: "none" }}
      />
      <canvas ref={canvasRef} width={640} height={480} />
      <div>
        <label htmlFor="maskAlpha">Mask Alpha: {maskAlpha.toFixed(1)}</label>
        <input
          type="range"
          id="maskAlpha"
          min="0"
          max="1"
          step="0.1"
          value={maskAlpha}
          onChange={handleMaskAlphaChange}
        />
      </div>
      <div>
        <label htmlFor="confidenceThreshold">Confidence Threshold: {confidenceThreshold.toFixed(1)}</label>
        <input
          type="range"
          id="confidenceThreshold"
          min="0"
          max="1"
          step="0.1"
          value={confidenceThreshold}
          onChange={handleConfidenceThresholdChange}
        />
      </div>
      <ImageSegmentClothes
        videoRef={videoRef}
        canvasRef={canvasRef}
        maskAlpha={maskAlpha}
        confidenceThreshold={confidenceThreshold}
      />
    </div>
  );
}
