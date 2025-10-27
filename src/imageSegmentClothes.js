// ImageSegmentClothes.jsx
import { useEffect } from "react";
import { FilesetResolver, ImageSegmenter } from "@mediapipe/tasks-vision";

/**
 * Props:
 *  - videoRef: HTMLVideoElement ref (camera stream)
 *  - canvasRef: HTMLCanvasElement ref (overlay / output)
 *  - maskAlpha: number (0..1) optional - マスクのアルファ
 *  - freqMs: number optional - 推論間隔（ミリ秒）。0で毎フレーム（注意：重い）
 *  - confidenceThreshold: number (0..1) optional - 信頼度しきい値
 */
const ImageSegmentClothes = ({ videoRef, canvasRef, maskAlpha = 0.6, freqMs = 100, confidenceThreshold = 0.5 }) => {
  useEffect(() => {
    let segmenter = null;
    let stream = null;
    let mounted = true;
    let lastRun = 0;

    const init = async () => {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
      );

      const modelUrl =
        "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/latest/selfie_multiclass_256x256.tflite";

      segmenter = await ImageSegmenter.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: modelUrl,
        },
        outputCategoryMask: false, // We will use confidence masks
        outputConfidenceMasks: true,
        runningMode: "VIDEO",
      });

      stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (!videoRef.current) return;
      videoRef.current.srcObject = stream;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");

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

      const renderLoop = async (now) => {
        if (!mounted) return;

        if (freqMs <= 0 || now - lastRun >= freqMs) {
          try {
            const res = segmenter.segmentForVideo(video, now);

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

                const out = new Uint8ClampedArray(mw * mh * 4);
                for (let i = 0, j = 0; i < maskArray.length; i++, j += 4) {
                  const confidence = maskArray[i];
                  if (confidence > confidenceThreshold) {
                    // Copy original pixel data for clothes
                    out[j] = originalPixels[j];
                    out[j + 1] = originalPixels[j + 1];
                    out[j + 2] = originalPixels[j + 2];
                    out[j + 3] = Math.floor(maskAlpha * 255); // Use maskAlpha for clothes transparency
                  } else {
                    // Make non-clothes transparent
                    out[j] = 0;
                    out[j + 1] = 0;
                    out[j + 2] = 0;
                    out[j + 3] = 0;
                  }
                }
                const imageData = new ImageData(out, mw, mh);
                ctx.drawImage(await createImageBitmap(imageData), 0, 0, canvas.width, canvas.height);
              }
            } else {
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
        segmenter?.close();
      } catch (e) {}
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [videoRef, canvasRef, maskAlpha, freqMs, confidenceThreshold]);

  return null;
};

export default ImageSegmentClothes;
