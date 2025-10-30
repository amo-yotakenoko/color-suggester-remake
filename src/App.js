import { useRef, useState } from "react";
import ImageSegmentClothes from "./imageSegmentClothes";
import MunsellCanvas from "./MunsellCanvas";
import ExtractedColorsView from "./ExtractedColorsView";

export default function App() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [maskAlpha, setMaskAlpha] = useState(0.6);
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.1);
  const [isCapturing, setIsCapturing] = useState(false);
  const [extractedColors, setExtractedColors] = useState([]);
  const [resumeKey, setResumeKey] = useState(0);

  const handleMaskAlphaChange = (e) => {
    setMaskAlpha(parseFloat(e.target.value));
  };

  const handleConfidenceThresholdChange = (e) => {
    setConfidenceThreshold(parseFloat(e.target.value));
  };

  const handleCapture = () => {
    setIsCapturing(true);
    setExtractedColors([]);
  };

  const onCaptureFinished = () => {
    setIsCapturing(false);
  };

  const handleResume = () => {
    setExtractedColors([]);
    setResumeKey(prevKey => prevKey + 1);
  };

  const isPaused = extractedColors.length > 0;

  return (
    <div className="container-fluid vh-100 d-flex flex-column bg-dark text-light p-4">
      <h1 className="text-center mb-4">服色抽出</h1>
      <div className="row flex-grow-1" style={{ minHeight: '0' }}>
        <div className="col-md-7 d-flex flex-column align-items-center justify-content-center">
          <MunsellCanvas extractedColors={extractedColors} />
        </div>
        <div className="col-md-5 d-flex flex-column" style={{ minHeight: '0' }}>
          <div className="d-flex flex-column align-items-center justify-content-center mb-4">
            <video
              ref={videoRef}
              width={640}
              height={480}
              style={{ display: "none" }}
            />
            <canvas ref={canvasRef} className="img-fluid rounded shadow-lg" width={640} height={480} />
          </div>
          <div className="mb-4 p-4 bg-secondary rounded">
            <h2 className="h4">設定{`${isCapturing}`}</h2>
            <div className="form-group">
              <label htmlFor="maskAlph">マスクの透明度: {maskAlpha.toFixed(2)}</label>
              <input
                type="range"
                id="maskAlpha"
                className="form-control-range"
                min="0"
                max="1"
                step="0.01"
                value={maskAlpha}
                onChange={handleMaskAlphaChange}
              />
            </div>
            <div className="form-group mt-3">
              <label htmlFor="confidenceThreshold">信頼度のしきい値: {confidenceThreshold.toFixed(2)}</label>
              <input
                type="range"
                id="confidenceThreshold"
                className="form-control-range"
                min="0"
                max="1"
                step="0.01"
                value={confidenceThreshold}
                onChange={handleConfidenceThresholdChange}
              />
            </div>
          </div>
          <button 
            onClick={isPaused ? handleResume : handleCapture} 
            className={`btn ${isPaused ? 'btn-success' : 'btn-primary'} btn-lg w-100 mb-4`}
            disabled={isCapturing}
          >
            {isCapturing ? "抽出中..." : (isPaused ? "再開" : "色を抽出")}
          </button>
          <ExtractedColorsView colors={extractedColors} />
        </div>
      </div>
      <ImageSegmentClothes
        key={resumeKey}
        videoRef={videoRef}
        canvasRef={canvasRef}
        maskAlpha={maskAlpha}
        confidenceThreshold={confidenceThreshold}
        isCapturing={isCapturing}
        setExtractedColors={setExtractedColors}
        onCaptureFinished={onCaptureFinished}
      />
    </div>
  );
}


