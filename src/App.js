import { useRef, useState } from "react";
import ImageSegmentClothes from "./imageSegmentClothes";

export default function App() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [maskAlpha, setMaskAlpha] = useState(0.6); // Default mask alpha
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.1); // Default confidence threshold
  const [isCapturing, setIsCapturing] = useState(false);
  const [extractedColors, setExtractedColors] = useState([]);

  const handleMaskAlphaChange = (e) => {
    setMaskAlpha(parseFloat(e.target.value));
  };

  const handleConfidenceThresholdChange = (e) => {
    setConfidenceThreshold(parseFloat(e.target.value));
  };

  const handleCapture = () => {
    setIsCapturing(true);
    setExtractedColors([]); // Clear previous colors
  };

  const handleCaptureComplete = (colors) => {
    setExtractedColors(colors);
    setIsCapturing(false);
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
        <label htmlFor="maskAlpha">Mask Alpha: {maskAlpha.toFixed(2)}</label>
        <input
          type="range"
          id="maskAlpha"
          min="0"
          max="1"
          step="0.01"
          value={maskAlpha}
          onChange={handleMaskAlphaChange}
        />
      </div>
      <div>
        <label htmlFor="confidenceThreshold">Confidence Threshold: {confidenceThreshold.toFixed(2)}</label>
        <input
          type="range"
          id="confidenceThreshold"
          min="0"
          max="1"
          step="0.01"
          value={confidenceThreshold}
          onChange={handleConfidenceThresholdChange}
        />
      </div>
      <button onClick={handleCapture} disabled={isCapturing}>
        {isCapturing ? "Capturing..." : "Capture Colors"}
      </button>
      {extractedColors.length > 0 && (
        <div>
          <h2>Extracted Colors:</h2>
          <div style={{ display: 'flex' }}>
            {extractedColors.map((color, index) => (
              <div
                key={index}
                style={{
                  backgroundColor: `rgb(${color})`,
                  width: '50px',
                  height: '50px',
                  margin: '5px',
                  border: '1px solid #fff',
                }}
              />
            ))}
          </div>
        </div>
      )}
      <ImageSegmentClothes
        videoRef={videoRef}
        canvasRef={canvasRef}
        maskAlpha={maskAlpha}
        confidenceThreshold={confidenceThreshold}
        isCapturing={isCapturing}
        onCaptureComplete={handleCaptureComplete}
      />
    </div>
  );
}