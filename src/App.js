import { useRef, useState, useEffect } from "react";
import ImageSegmentClothes from "./imageSegmentClothes";
import MunsellCanvas from "./MunsellCanvas";
import ExtractedColorsView from "./ExtractedColorsView";
import ProgressBar from 'react-bootstrap/ProgressBar';
import 'bootstrap/dist/css/bootstrap.min.css';
import { extractDominantColorsKMeans } from "./k-means";
import BeautyScoreView from "./BeautyScoreView";
import ColorSuggest from "./ColorSuggest";
import { calculateBeautyDetails } from "./utils/beautyCalculator";
import beautyToPoint from "./utils/beautyCalculator";
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
  const [munsellColors, setMunsellColors] = useState(null);
  const [cameraRotation, setCameraRotation] = useState(90); // カメラの回転角度（90度がデフォルト）
  const [isPaused, setIsPaused] = useState(false);
  const [beautyScore, setBeautyScore] = useState(null);

  useEffect(() => {
    const base = process.env.PUBLIC_URL || '';
    fetch(`${base}/munsell/colorcodeToHVC.txt`)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load Munsell data: ${res.status}`);
        return res.text();
      })
      .then((text) => {
        const parsed = text.split('\n').map((line) => {
          const parts = line.split('\t');
          if (parts.length < 4) return null;
          const hex = parts[0].trim();
          const hvc = [parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3])];
          // convert hex to rgb array
          let hexClean = hex;
          if (!hexClean.startsWith('#')) hexClean = '#' + hexClean;
          let num = parseInt(hexClean.slice(1), 16);
          const r = (num >> 16) & 255;
          const g = (num >> 8) & 255;
          const b = num & 255;
          return { hex: hexClean, hvc, rgb: [r, g, b] };
        }).filter(Boolean);
        setMunsellColors(parsed);
      })
      .catch((err) => console.error('Error loading munsell in App:', err));
  }, []);

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
    setIsPaused(true);
  };

  const handleResume = () => {
    setAllExtractedColors([]);
    setClusteredColors([]);
    setResumeKey(prevKey => prevKey + 1);
    setIsPaused(false);
    setBeautyScore(null);
  };

  // allExtractedColors または numColors が変更されたときにクラスタリングを再実行
  useEffect(() => {
    if (allExtractedColors.length > 0) {
      const dominantColors = extractDominantColorsKMeans(allExtractedColors, numColors);
      setClusteredColors(dominantColors.map(colorStr => colorStr.split(',').map(Number)));
    }
  }, [allExtractedColors, numColors]);

  useEffect(() => {
    if (clusteredColors.length > 1) {
      const score = calculateBeautyDetails(clusteredColors);
      setBeautyScore(score);
    } else {
      setBeautyScore(null);
    }
  }, [clusteredColors]);

  return (
    <div className="container-fluid vh-100 d-flex flex-column bg-dark text-light p-2">
      <div className="row flex-grow-1 g-2 h-100" style={{ minHeight: '0' }}>
        {/* 左側のカラム（マンセル色立体と美度） */}
        <div className="col-4 d-flex flex-column">
          {/* マンセル色立体 */}
          <div className="rounded mb-2" style={{ 
            flex: 3,
            position: 'relative',
            background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ position: 'absolute', inset: 0 }}>
              <MunsellCanvas extractedColors={clusteredColors} munsellColors={munsellColors} isPaused={isPaused} />
            </div>
          </div>
          {/* 美度計算とサンプル */}
          <div style={{ flex: 2 }}>
            {/* 美度計算 */}
            <div className="rounded" style={{ 
              overflowY: 'auto',
              maxHeight: 'calc(100% - 80px)'
            }}>
              <BeautyScoreView beautyScore={beautyScore} />
            </div>
          </div>
        </div>

        {/* 中央カラム（カメラビュー） */}
        <div className="col-4 d-flex flex-column">
          <div className="flex-grow-1 rounded overflow-hidden position-relative" style={{
            background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
          }}>
            <video
              ref={videoRef}
              width={640}
              height={480}
              style={{ display: "none" }}
            />
            <canvas 
              ref={canvasRef} 
              className="position-absolute top-50 start-50 translate-middle" 
              style={{
                width: '100%',
                height: 'auto',
                transform: 'translate(-50%, -50%) rotate(90deg)',
                maxHeight: '133.33%' // 4:3のアスペクト比を維持したまま90度回転
              }}
            />
            {clusteredColors && clusteredColors.length > 0 && (
              <div
                className="position-absolute bottom-0 start-50 translate-middle-x text-white p-2"
                style={{
                  background: 'rgba(0, 0, 0, 0.5)',
                  borderRadius: '10px 10px 0 0',
                  textShadow: '2px 2px 4px rgba(0,0,0,0.7)',
                  paddingTop: '0.5rem',
                  paddingBottom: '0.5rem',
                  marginBottom: '5rem' // Adjust this value to position it above the beauty score
                }}
              >
                <ExtractedColorsView colors={clusteredColors} colorSize={50} />
              </div>
            )}
            {beautyScore && (
              <div 
                className="position-absolute bottom-0 start-50 translate-middle-x text-white p-2"
                style={{
                  background: 'rgba(0, 0, 0, 0.5)',
                  borderRadius: '10px',
                  textShadow: '2px 2px 4px rgba(0,0,0,0.7)',
                  fontSize: '2.5rem',
                  fontWeight: 'bold',
                  lineHeight: 1,
                  marginBottom: '1rem'
                }}
              >
                {beautyToPoint(beautyScore.beauty).toFixed(3)}点
              </div>
            )}
          </div>
          {/* 設定パネル */}
          <div className="mt-2 p-3 rounded" style={{ 
            background: 'linear-gradient(135deg, #2c3e50, #34495e)',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
          }}>
            <h2 className="h5 text-white mb-3" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>
              設定 {isCapturing && <span className="badge bg-info">抽出中</span>}
            </h2>
            <div className="row g-2">
              <div className="col-4">
                <label className="d-block text-white small mb-1">透明度: {maskAlpha.toFixed(2)}</label>
                <input
                  type="range"
                  className="form-range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={maskAlpha}
                  onChange={handleMaskAlphaChange}
                />
              </div>
              <div className="col-4">
                <label className="d-block text-white small mb-1">信頼度: {confidenceThreshold.toFixed(2)}</label>
                <input
                  type="range"
                  className="form-range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={confidenceThreshold}
                  onChange={handleConfidenceThresholdChange}
                />
              </div>
              <div className="col-4">
                <label className="d-block text-white small mb-1">カメラ回転</label>
                <select 
                  className="form-select form-select-sm"
                  value={cameraRotation}
                  onChange={(e) => setCameraRotation(Number(e.target.value))}
                  style={{
                    background: 'rgba(255,255,255,0.1)',
                    color: 'white',
                    border: '1px solid rgba(255,255,255,0.2)'
                  }}
                >
                  <option value="0">回転なし</option>
                  <option value="90">90度</option>
                  <option value="180">180度</option>
                  <option value="270">270度</option>
                </select>
              </div>
            </div>
            <div className="mt-2 d-flex gap-2 align-items-center">
              <div style={{ flex: 1 }}>
                <label className="d-block text-white small mb-1">色の数: {numColors}</label>
                <input
                  type="range"
                  className="form-range"
                  min="1"
                  max="10"
                  step="1"
                  value={numColors}
                  onChange={(e) => setNumColors(parseInt(e.target.value))}
                />
              </div>
              <button
                onClick={isPaused ? handleResume : handleCapture}
                className={`btn ${isPaused ? 'btn-success' : 'btn-primary'}`}
                style={{
                  background: isPaused ? 'linear-gradient(135deg, #2ecc71, #27ae60)' : 'linear-gradient(135deg, #3498db, #2980b9)',
                  border: 'none',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                  minWidth: '100px'
                }}
                disabled={isCapturing}
              >
                {isCapturing ? "抽出中..." : (isPaused ? "再開" : "抽出")}
              </button>
            </div>
            {isCapturing && (
              <div className="mt-2">
                <ProgressBar 
                  now={progress * 100} 
                  label={`${Math.round(progress * 100)}%`}
                  variant="info"
                  style={{ height: '4px' }}
                />
              </div>
            )}
          </div>
        </div>

        {/* 右側のカラム（色の提案） */}
        <div className="col-4 h-100" style={{ overflowY: 'auto' }}>
          <ColorSuggest clusteredColors={clusteredColors} munsellColors={munsellColors} />
        </div>
      </div>
      <ImageSegmentClothes
        key={resumeKey}
        videoRef={videoRef}
        canvasRef={canvasRef}
        maskAlpha={maskAlpha}
        confidenceThreshold={confidenceThreshold}
        isCapturing={isCapturing}
        setAllExtractedColors={setAllExtractedColors}
        onCaptureFinished={onCaptureFinished}
        onProgress={setProgress}
        rotation={cameraRotation}
        isPaused={isPaused}
      />
    </div>
  );
}