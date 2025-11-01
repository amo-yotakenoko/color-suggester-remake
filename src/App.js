import { useRef, useState, useEffect } from "react";
import ImageSegmentClothes from "./imageSegmentClothes";
import MunsellCanvas from "./MunsellCanvas";
import ExtractedColorsView from "./ExtractedColorsView";
import ProgressBar from 'react-bootstrap/ProgressBar';
import 'bootstrap/dist/css/bootstrap.min.css';
import { extractDominantColorsKMeans } from "./k-means";
import BeautyScoreView from "./BeautyScoreView";
import ColorSuggest from "./ColorSuggest";

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
    <div className="container-fluid vh-100 d-flex flex-column bg-dark text-light p-2">
      {/* <h1 className="text-center mb-2">服色抽出</h1> */}
      <div className="row flex-grow-1 g-2" style={{ minHeight: '0' }}>
        {/* 左側のカラム（カメラビューと設定） */}
        <div className="col-6 d-flex flex-column" style={{ height: 'calc(100vh - 80px)' }}>
          {/* 上部：カメラビュー */}
          <div className="flex-grow-0" style={{ height: '60%' }}>
            <video
              ref={videoRef}
              width={640}
              height={480}
              style={{ display: "none" }}
            />
            <canvas ref={canvasRef} className="img-fluid rounded shadow-lg" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          {/* 下部：設定パネル */}
          <div className="flex-grow-1 p-2 bg-secondary rounded mt-2" style={{ height: '40%', overflowY: 'auto' }}>
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
            <div className="form-group mt-2">
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
            <div className="form-group mt-2">
              <label htmlFor="numColors">抽出する色の数: {numColors}</label>
              <input
                type="range"
                id="numColors"
                className="form-control-range"
                min="1"
                max="10"
                step="1"
                value={numColors}
                onChange={(e) => setNumColors(parseInt(e.target.value))}
              />
            </div>
            <button
              onClick={isPaused ? handleResume : handleCapture}
              className={`btn ${isPaused ? 'btn-success' : 'btn-primary'} btn-lg w-100 mt-2`}
              disabled={isCapturing}
            >
              {isCapturing ? "抽出中..." : (isPaused ? "再開" : "色を抽出")}
            </button>
            {isCapturing && <ProgressBar now={progress * 100} label={`${Math.round(progress * 100)}%`} className="mt-2" />}
          </div>
        </div>
        
        {/* 右側のカラム（マンセル色立体、抽出色、美度計算） */}
        <div className="col-6 d-flex flex-column" style={{ height: 'calc(100vh - 80px)', gap: '8px' }}>
          {/* 上部：マンセル色立体 */}
          <div style={{ height: '300px', position: 'relative' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
              <MunsellCanvas extractedColors={clusteredColors} munsellColors={munsellColors} />
            </div>
          </div>
          {/* 抽出色表示 */}
          <div style={{ flexShrink: 0 }}>
            <ExtractedColorsView colors={clusteredColors} />
          </div>
          {/* 下部：美度計算とカラーサジェスト（スクロール可能） */}
          <div className="flex-grow-1" style={{ 
            overflowY: 'auto',
            minHeight: '200px',
            maxHeight: 'calc(100vh - 480px)'
          }}>
            <BeautyScoreView clusteredColors={clusteredColors} />
            <ColorSuggest clusteredColors={clusteredColors} munsellColors={munsellColors} />
          </div>
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


