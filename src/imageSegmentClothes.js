import { useEffect, useRef } from "react";
import { FilesetResolver, ImageSegmenter } from "@mediapipe/tasks-vision";
import { colorDistance } from "./colorutil";

// Helper: confidenceMask を Float32Array に変換して返す
function maskToFloat32Array(confidenceMaskImage) {
  try {
    if (typeof confidenceMaskImage.getAsFloat32Array === "function") {
      return confidenceMaskImage.getAsFloat32Array();
    }
    if (confidenceMaskImage.data) {
      return new Float32Array(confidenceMaskImage.data.buffer || confidenceMaskImage.data);
    }
  } catch (e) {
    console.warn("maskToFloat32Array fallback", e);
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


const ImageSegmentClothes = ({ videoRef, canvasRef, maskAlpha = 0.6, freqMs = 100, confidenceThreshold = 0.5, isCapturing, setExtractedColors, onCaptureFinished }) => {
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
      if (!mounted || captureModeRef.current || !videoRef.current || !canvasRef.current || !videoSegmenterRef.current) {
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

          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.clearRect(0, 0, canvas.width, canvas.height);

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
              ctx.drawImage(await createImageBitmap(imageData), 0, 0, canvas.width, canvas.height);
            } else {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            }
          } else {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          }
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
  }, [videoRef, canvasRef, maskAlpha, freqMs, confidenceThreshold]);

  // Handle capture mode
  useEffect(() => {
    const process = async () => {
      if (isCapturing && streamRef.current && videoRef.current && canvasRef.current && videoSegmenterRef.current && imageSegmenterRef.current) {
        captureModeRef.current = true;
        streamRef.current.getTracks().forEach((t) => t.stop()); // Stop camera

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");

        // Draw current frame to canvas to get ImageData
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const fullFrameImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        // Perform segmentation on the captured frame
        const res = imageSegmenterRef.current.segment(fullFrameImageData);

        const CLOTHES_CLASS = 4;
        const clothesConfidenceMask = res.confidenceMasks && res.confidenceMasks[CLOTHES_CLASS];

        if (clothesConfidenceMask) {
          const mw = clothesConfidenceMask.width || video.videoWidth;
          const mh = clothesConfidenceMask.height || video.videoHeight;
          const maskArray = maskToFloat32Array(clothesConfidenceMask);
          const localColors = [];
            setExtractedColors(localColors);
          if (maskArray) {
            const clothesImageData = ctx.createImageData(mw, mh);
            const interval =parseInt((canvas.width * canvas.height)/1000 ) ; // Sample approx 1000 pixels
            console.log(`Sampling interval: ${interval}`);
            const processMask = () => new Promise(resolve => {
              let i = 0;
              const processChunk = () => {
                const chunkSize = 50; // Process 50k pixels at a time
                const limit = Math.min(i + chunkSize, maskArray.length);
                console.log(`Processing ${i}/${maskArray.length}`);
                for (; i < limit; i += interval) {
                  const j = i * 4;
                  const confidence = maskArray[i];
                  if (confidence > confidenceThreshold) {
                    const r = fullFrameImageData.data[j];
                    const g = fullFrameImageData.data[j + 1];
                    const b = fullFrameImageData.data[j + 2];
                    // Copy original pixel data for clothes
                    clothesImageData.data[j] = r;
                    clothesImageData.data[j + 1] = g;
                    clothesImageData.data[j + 2] = b;
                    clothesImageData.data[j + 3] = 255; // Fully opaque
                    // if (localColors.length <= 0 || colorDistance(localColors[localColors.length - 1], [r, g, b]) > 30){
                      const newColor = [r, g, b];
                      localColors.push(newColor);
                      setExtractedColors(localColors);
                    // }
                  } 
                }
                if (i < maskArray.length) {
                  setTimeout(processChunk, 0);
                } else {
                  console.log(`Processing ${maskArray.length}/${maskArray.length}`);
                  resolve();
                }
              }
              processChunk();
            });

            await processMask();
            console.log(`抽出終了色数: ${localColors.length}`);
            onCaptureFinished();
          } else {
            onCaptureFinished();
          }
        } else {
          onCaptureFinished(); // No clothes detected
        }
      }
    }
    process();
  }, [isCapturing ]);

  return null;
};


export default ImageSegmentClothes;