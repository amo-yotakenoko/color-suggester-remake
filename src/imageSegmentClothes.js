// ImageSegmentClothes.jsx
import { useEffect, useRef } from "react";
import { FilesetResolver, ImageSegmenter } from "@mediapipe/tasks-vision";

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

// Helper: extract all dominant colors from an ImageData (blocking, for capture)
function extractAllColors(imageData) {
  const colorCounts = {};
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];

    if (a >= 255) { // Only consider opaque pixels
      const key = `${r},${g},${b}`;
      colorCounts[key] = (colorCounts[key] || 0) + 1;
    }
  }

  const dominantColors = Object.keys(colorCounts)
    .sort((a, b) => colorCounts[b] - colorCounts[a])
    .slice(0, 5); // Get top 5 dominant colors

  return dominantColors;
}

/**
 * Props:
 *  - videoRef: HTMLVideoElement ref (camera stream)
 *  - canvasRef: HTMLCanvasElement ref (overlay / output)
 *  - maskAlpha: number (0..1) optional - マスクのアルファ
 *  - freqMs: number optional - 推論間隔（ミリ秒）。0で毎フレーム（注意：重い）
 *  - confidenceThreshold: number (0..1) optional - 信頼度しきい値
 */
const ImageSegmentClothes = ({ videoRef, canvasRef, maskAlpha = 0.6, freqMs = 100, confidenceThreshold = 0.5, isCapturing, onCaptureComplete }) => {
  const videoSegmenterRef = useRef(null);
  const imageSegmenterRef = useRef(null);
  const streamRef = useRef(null);
  const captureModeRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    let lastRun = 0;

    const init = async () => {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
      );

      const modelUrl =
        "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/latest/selfie_multiclass_256x256.tflite";

      videoSegmenterRef.current = await ImageSegmenter.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: modelUrl,
        },
        outputCategoryMask: false,
        outputConfidenceMasks: true,
        runningMode: "VIDEO",
      });

      imageSegmenterRef.current = await ImageSegmenter.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: modelUrl,
        },
        outputCategoryMask: false,
        outputConfidenceMasks: true,
        runningMode: "IMAGE",
      });

      streamRef.current = await navigator.mediaDevices.getUserMedia({ video: true });
      if (!videoRef.current) return;
      videoRef.current.srcObject = streamRef.current;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");

      const renderLoop = async (now) => {
        if (!mounted) return;
        if (captureModeRef.current) return; // Stop rendering if in capture mode

        if (freqMs <= 0 || now - lastRun >= freqMs) {
          try {
            const inferenceStartTime = performance.now();
            const res = videoSegmenterRef.current.segmentForVideo(video, now);
            const inferenceEndTime = performance.now();
            console.log(`Inference time: ${inferenceEndTime - inferenceStartTime} ms`);

            const CLOTHES_CLASS = 4; // Use CLOTHES_CLASS
            const clothesConfidenceMask = res.confidenceMasks && res.confidenceMasks[CLOTHES_CLASS];

            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            if (clothesConfidenceMask) {
              const mw = clothesConfidenceMask.width || video.videoWidth;
              const mh = clothesConfidenceMask.height || video.videoHeight;
              const maskArray = maskToFloat32Array(clothesConfidenceMask);

              if (maskArray) {
                // Get original video frame data
                const tempCanvas = document.createElement("canvas");
                tempCanvas.width = video.videoWidth;
                tempCanvas.height = video.videoHeight;
                const tempCtx = tempCanvas.getContext("2d");
                tempCtx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
                const originalImageData = tempCtx.getImageData(0, 0, video.videoWidth, video.videoHeight);
                const originalPixels = originalImageData.data;

                const maskCreationStartTime = performance.now();
                const out = new Uint8ClampedArray(mw * mh * 4);
                for (let i = 0, j = 0; i < maskArray.length; i++, j += 4) {
                  const confidence = maskArray[i];
                  if (confidence > confidenceThreshold) {
                    // Copy original pixel data for clothes
                    out[j] = originalPixels[j];
                    out[j + 1] = originalPixels[j + 1];
                    out[j + 2] = originalPixels[j + 2];
                    out[j + 3] = 255; // Fully opaque for clothes
                  } else {
                    // Darken original video for non-clothes areas
                    const darkenFactor = 0.3; // Adjust this value to control darkness
                    out[j] = originalPixels[j] * darkenFactor;
                    out[j + 1] = originalPixels[j + 1] * darkenFactor;
                    out[j + 2] = originalPixels[j + 2] * darkenFactor;
                    out[j + 3] = Math.floor(maskAlpha * 255); // Apply maskAlpha for transparency
                  }
                }
                const maskCreationEndTime = performance.now();
                console.log(`Mask creation time: ${maskCreationEndTime - maskCreationStartTime} ms`);

                const imageData = new ImageData(out, mw, mh);
                ctx.drawImage(await createImageBitmap(imageData), 0, 0, canvas.width, canvas.height);
              } else {
                // If no clothes mask, just draw the original video (or clear canvas)
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              }
            }
            else {
              // If no clothes mask, just draw the original video (or clear canvas)
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            }
          } catch (err) {
            console.error("segmentForVideo error:", err);
          }

          lastRun = now;
        }

        requestAnimationFrame(renderLoop);
      };

      video.addEventListener("playing", () => {
        requestAnimationFrame(renderLoop);
      });

      try {
        await video.play();
      } catch (e) {
        console.error(e);
      }
    }; // init()

    init();

    return () => {
      mounted = false;
      try {
        videoSegmenterRef.current?.close();
        imageSegmenterRef.current?.close();
      } catch (e) {}
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [videoRef, canvasRef, maskAlpha, freqMs, confidenceThreshold]);

  // Handle capture mode
  useEffect(() => {
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
      const res = imageSegmenterRef.current.segment(fullFrameImageData); // Use segment for static image

      const CLOTHES_CLASS = 4;
      const clothesConfidenceMask = res.confidenceMasks && res.confidenceMasks[CLOTHES_CLASS];

      if (clothesConfidenceMask) {
        const mw = clothesConfidenceMask.width || video.videoWidth;
        const mh = clothesConfidenceMask.height || video.videoHeight;
        const maskArray = maskToFloat32Array(clothesConfidenceMask);

        if (maskArray) {
          const clothesImageData = ctx.createImageData(mw, mh);
          for (let i = 0, j = 0; i < maskArray.length; i++, j += 4) {
            const confidence = maskArray[i];
            if (confidence > confidenceThreshold) {
              // Copy original pixel data for clothes
              clothesImageData.data[j] = fullFrameImageData.data[j];
              clothesImageData.data[j + 1] = fullFrameImageData.data[j + 1];
              clothesImageData.data[j + 2] = fullFrameImageData.data[j + 2];
              clothesImageData.data[j + 3] = 255; // Fully opaque
            } else {
              // Make non-clothes transparent
              clothesImageData.data[j] = 0;
              clothesImageData.data[j + 1] = 0;
              clothesImageData.data[j + 2] = 0;
              clothesImageData.data[j + 3] = 0;
            }
          }
          const colors = extractAllColors(clothesImageData); // Extract colors from only clothes
          onCaptureComplete(colors);
        }
      } else {
        onCaptureComplete([]); // No clothes detected
      }
    }
  }, [isCapturing, videoRef, canvasRef, confidenceThreshold, onCaptureComplete]);

  return null;
};

export default ImageSegmentClothes;