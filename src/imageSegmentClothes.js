import { useEffect, useRef } from "react";
import { FilesetResolver, ImageSegmenter } from "@mediapipe/tasks-vision";
import { colorDistance } from "./colorutil";
// import { extractDominantColorsKMeans } from "./k-means"; // 削除

// Helper: confidenceMask を Float32Array に変換して返す
function maskToFloat32Array(confidenceMaskImage) {
  try {
    if (!confidenceMaskImage) {
      console.warn("maskToFloat32Array: 無効な入力");
      return null;
    }
    if (typeof confidenceMaskImage.getAsFloat32Array === "function") {
      return confidenceMaskImage.getAsFloat32Array();
    }
    if (confidenceMaskImage.data) {
      const buffer = confidenceMaskImage.data.buffer || confidenceMaskImage.data;
      return new Float32Array(buffer);
    }
    console.warn("maskToFloat32Array: サポートされていないデータ形式");
  } catch (e) {
    console.error("maskToFloat32Array エラー:", e);
  }
  return null;
}

let segmenterPromise = null;
const getSegmenter = async () => {
  if (!segmenterPromise) {
    segmenterPromise = (async () => {
      console.log("モデル初期化");
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
      );
      const modelUrl =
        "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/latest/selfie_multiclass_256x256.tflite";
      
      const videoSegmenter = await ImageSegmenter.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: modelUrl,
          delegate: "GPU",
        },
        outputCategoryMask: false,
        outputConfidenceMasks: true,
        runningMode: "VIDEO",
      });

      const imageSegmenter = await ImageSegmenter.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: modelUrl,
        },
        outputCategoryMask: false,
        outputConfidenceMasks: true,
        runningMode: "IMAGE",
      });

      return { videoSegmenter, imageSegmenter };
    })();
  }
  return await segmenterPromise;
};


const ImageSegmentClothes = ({ videoRef, canvasRef, maskAlpha = 0.6, freqMs = 100, confidenceThreshold = 0.5, isCapturing, setAllExtractedColors, onCaptureFinished, onProgress, rotation = 90, isPaused }) => { // isPaused を追加
  const videoSegmenterRef = useRef(null);
  const imageSegmenterRef = useRef(null);
  const streamRef = useRef(null);
  const captureModeRef = useRef(false);

  // Effect for initialization
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const { videoSegmenter, imageSegmenter } = await getSegmenter();
      videoSegmenterRef.current = videoSegmenter;
      imageSegmenterRef.current = imageSegmenter;

      try {
        streamRef.current = await navigator.mediaDevices.getUserMedia({ video: true });
        if (mounted && videoRef.current) {
          videoRef.current.srcObject = streamRef.current;
          await videoRef.current.play();
        }
      } catch (e) {
        console.error("Failed to get user media", e);
      }
    };
console.log("モデル初期化")
    init();

    return () => {
      mounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [videoRef]);

  // Effect for rendering loop
  useEffect(() => {
    let lastRun = 0;
    let animationFrameId;
    let mounted = true;

    const renderLoop = async (now) => {
      if (isPaused || !mounted || !videoRef.current || !canvasRef.current || !videoSegmenterRef.current) {
        if(mounted) animationFrameId = requestAnimationFrame(renderLoop);
        return;
      }
      
      const video = videoRef.current;
      if (video.paused || video.ended) {
        animationFrameId = requestAnimationFrame(renderLoop);
        return;
      }


      if (freqMs <= 0 || now - lastRun >= freqMs) {
        lastRun = now;
        
        try {
          const res = videoSegmenterRef.current.segmentForVideo(video, now);
          const canvas = canvasRef.current;
          const ctx = canvas.getContext("2d");

          const CLOTHES_CLASS = 4;
          const clothesConfidenceMask = res.confidenceMasks && res.confidenceMasks[CLOTHES_CLASS];

          // キャンバスのサイズを設定
          if (rotation === 90 || rotation === 270) {
            canvas.width = video.videoHeight;
            canvas.height = video.videoWidth;
          } else {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
          }
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          
          // 回転を適用
          ctx.save();
          if (rotation === 90) {
            ctx.translate(canvas.width, 0);
            ctx.rotate(90 * Math.PI / 180);
          } else if (rotation === 180) {
            ctx.translate(canvas.width, canvas.height);
            ctx.rotate(180 * Math.PI / 180);
          } else if (rotation === 270) {
            ctx.translate(0, canvas.height);
            ctx.rotate(270 * Math.PI / 180);
          }

          if (clothesConfidenceMask) {
            const mw = clothesConfidenceMask.width || video.videoWidth;
            const mh = clothesConfidenceMask.height || video.videoHeight;
            const maskArray = maskToFloat32Array(clothesConfidenceMask);

            if (maskArray) {
              const tempCanvas = document.createElement("canvas");
              tempCanvas.width = video.videoWidth;
              tempCanvas.height = video.videoHeight;
              const tempCtx = tempCanvas.getContext("2d");
              tempCtx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
              const originalImageData = tempCtx.getImageData(0, 0, video.videoWidth, video.videoHeight);
              const originalPixels = originalImageData.data;

              const out = new Uint8ClampedArray(mw * mh * 4);
              for (let i = 0, j = 0; i < maskArray.length; i++, j += 4) {
                const confidence = maskArray[i];
                if (confidence > confidenceThreshold) {
                  out[j] = originalPixels[j];
                  out[j + 1] = originalPixels[j + 1];
                  out[j + 2] = originalPixels[j + 2];
                  out[j + 3] = 255;
                } else {
                  const darkenFactor = 0.3;
                  out[j] = originalPixels[j] * darkenFactor;
                  out[j + 1] = originalPixels[j + 1] * darkenFactor;
                  out[j + 2] = originalPixels[j + 2] * darkenFactor;
                  out[j + 3] = Math.floor(maskAlpha * 255);
                }
              }
              const imageData = new ImageData(out, mw, mh);
              ctx.drawImage(await createImageBitmap(imageData), 0, 0, video.videoWidth, video.videoHeight);
            } else {
              ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
            }
          } else {
            ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
          }
          
          // 回転状態をリセット
          ctx.restore();
        } catch (err) {
          console.error("segmentForVideo error:", err);
        }
      }
      animationFrameId = requestAnimationFrame(renderLoop);
    };

    const video = videoRef.current;
    const handlePlaying = () => {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = requestAnimationFrame(renderLoop);
    }
    if (video) {
      video.addEventListener("playing", handlePlaying);
    }
    
    animationFrameId = requestAnimationFrame(renderLoop);

    return () => {
      mounted = false;
      if (video) {
        video.removeEventListener("playing", handlePlaying);
      }
      cancelAnimationFrame(animationFrameId);
    };
  }, [videoRef, canvasRef, maskAlpha, freqMs, confidenceThreshold, rotation, isPaused]);

 useEffect(() => {
  const process = async () => {
    if (
      isCapturing &&
      streamRef.current &&
      videoRef.current &&
      canvasRef.current &&
      videoSegmenterRef.current &&
      imageSegmenterRef.current
    ) {
      captureModeRef.current = true;
      const video = videoRef.current;
      video.pause();

      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");

      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = video.videoWidth;
      tempCanvas.height = video.videoHeight;
      const tempCtx = tempCanvas.getContext("2d");
      tempCtx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
      const originalImageData = tempCtx.getImageData(0, 0, video.videoWidth, video.videoHeight);

      const res = imageSegmenterRef.current.segment(originalImageData);

      const CLOTHES_CLASS = 4;
      const clothesConfidenceMask = res.confidenceMasks && res.confidenceMasks[CLOTHES_CLASS];

      if (clothesConfidenceMask) {
        const mw = clothesConfidenceMask.width || video.videoWidth;
        const mh = clothesConfidenceMask.height || video.videoHeight;
        const maskArray = maskToFloat32Array(clothesConfidenceMask);
        let localColors = [];

        if (maskArray) {
          const out = new Uint8ClampedArray(mw * mh * 4);
          for (let i = 0, j = 0; i < maskArray.length; i++, j += 4) {
            const confidence = maskArray[i];
            if (confidence > confidenceThreshold) {
              out[j] = originalImageData.data[j];
              out[j + 1] = originalImageData.data[j + 1];
              out[j + 2] = originalImageData.data[j + 2];
              out[j + 3] = 255;
            } else {
              const darkenFactor = 0.3;
              out[j] = originalImageData.data[j] * darkenFactor;
              out[j + 1] = originalImageData.data[j + 1] * darkenFactor;
              out[j + 2] = originalImageData.data[j + 2] * darkenFactor;
              out[j + 3] = Math.floor(maskAlpha * 255);
            }
          }
          const imageData = new ImageData(out, mw, mh);
          
          // 回転を適用して描画
          if (rotation === 90 || rotation === 270) {
            canvas.width = video.videoHeight;
            canvas.height = video.videoWidth;
          } else {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
          }
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.save();
          if (rotation === 90) {
            ctx.translate(canvas.width, 0);
            ctx.rotate(90 * Math.PI / 180);
          } else if (rotation === 180) {
            ctx.translate(canvas.width, canvas.height);
            ctx.rotate(180 * Math.PI / 180);
          } else if (rotation === 270) {
            ctx.translate(0, canvas.height);
            ctx.rotate(270 * Math.PI / 180);
          }
          ctx.drawImage(await createImageBitmap(imageData), 0, 0, video.videoWidth, video.videoHeight);
          ctx.restore();

         const processMask = () => new Promise((resolve) => {
            const totalPixels = maskArray.length;
            const sampleCount = 20000; 
            let sampled = 0;

            const indices = new Uint32Array(sampleCount);
            for (let i = 0; i < sampleCount; i++) {
              indices[i] = Math.floor(Math.random() * totalPixels);
            }

            for (let n = 0; n < sampleCount; n++) {
              const i = indices[n];
              const j = i * 4;
              const confidence = maskArray[i];
              if (confidence > confidenceThreshold) {
                const r = originalImageData.data[j];
                const g = originalImageData.data[j + 1];
                const b = originalImageData.data[j + 2];
                localColors.push([r, g, b]);
              }
              sampled++;
              if (sampled % 100 === 0) {
                setAllExtractedColors([...localColors]);
              }
            }

            resolve();
          });

          await processMask();
          console.log(`抽出終了 色数: ${localColors.length}`);
          onCaptureFinished();
        } else {
          onCaptureFinished();
        }
      } else {
        onCaptureFinished();
      }
    } 
  };
  process();
}, [isCapturing, onProgress, setAllExtractedColors, onCaptureFinished, rotation, confidenceThreshold, maskAlpha]);

    
  return null;
};


export default ImageSegmentClothes;