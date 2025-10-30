import { useRef, useState, useEffect } from "react";
import ImageSegmentClothes from "./imageSegmentClothes";
import MunsellCanvas from "./MunsellCanvas";
import ExtractedColorsView from "./ExtractedColorsView";
import ProgressBar from 'react-bootstrap/ProgressBar';
import 'bootstrap/dist/css/bootstrap.min.css';
import { extractDominantColorsKMeans } from "./k-means";

export default function App() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [maskAlpha, setMaskAlpha] = useState(0.6);
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.1);
  const [isCapturing, setIsCapturing] = useState(false);
  const [allExtractedColors, setAllExtractedColors] = useState([]); // 全ての抽出色
  const [clusteredColors, setClusteredColors] = useState([]); // クラスタリング後の色
  const [numColors, setNumColors] = useState(5); // 色の数
  const [resumeKey, setResumeKey] = useState(0);
  const [progress, setProgress] = useState(0);

  const handleMaskAlphaChange = (e) => {
    setMaskAlpha(parseFloat(e.target.value));
  };

  const handleConfidenceThresholdChange = (e) => {
    setConfidenceThreshold(parseFloat(e.target.value));
  };

  const handleCapture = () => {
    setIsCapturing(true);
    setAllExtractedColors([]); // キャプチャ開始時にリセット
    setClusteredColors([]); // キャプチャ開始時にリセット
  };

  const onCaptureFinished = () => {
    setIsCapturing(false);
  };

  const handleResume = () => {
    setAllExtractedColors([]);
    setClusteredColors([]);
    setResumeKey(prevKey => prevKey + 1);
  };

  // allExtractedColors または numColors が変更されたときにクラスタリングを再実行
  useEffect(() => {
    if (allExtractedColors.length > 0) {
      const dominantColors = extractDominantColorsKMeans(allExtractedColors, numColors);
      setClusteredColors(dominantColors.map(colorStr => colorStr.split(',').map(Number)));
    }
  }, [allExtractedColors, numColors]);

  const isPaused = allExtractedColors.length > 0; // 抽出された色があるかどうかで一時停止状態を判断

  return (
    <div className="container-fluid vh-100 d-flex flex-column bg-dark text-light p-4">
      <h1 className="text-center mb-4">服色抽出</h1>
      <div className="row flex-grow-1" style={{ minHeight: '0' }}>
        <div className="col-md-7 d-flex flex-column align-items-center justify-content-center">
          <MunsellCanvas extractedColors={clusteredColors} /> {/* clusteredColors を渡す */}
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
            <div className="form-group mt-3"> {/* 色の数設定を追加 */}
              <label htmlFor="numColors">抽出する色の数: {numColors}</label>
              <input
                type="range"
                id="numColors"
                className="form-control-range"
                min="1"
                max="10" // 最大値を10に設定
                step="1"
                value={numColors}
                onChange={(e) => setNumColors(parseInt(e.target.value))}
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
          {isCapturing && <ProgressBar now={progress * 100} label={`${Math.round(progress * 100)}%`} className="mb-4" />}
          <ExtractedColorsView colors={clusteredColors} /> {/* clusteredColors を渡す */}
        </div>
      </div>
      <ImageSegmentClothes
        key={resumeKey}
        videoRef={videoRef}
        canvasRef={canvasRef}
        maskAlpha={maskAlpha}
        confidenceThreshold={confidenceThreshold}
        isCapturing={isCapturing}
        setAllExtractedColors={setAllExtractedColors} // setAllExtractedColors を渡す
        onCaptureFinished={onCaptureFinished}
        onProgress={setProgress}
      />
    </div>
  );
}


