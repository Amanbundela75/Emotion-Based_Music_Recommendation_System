import { useRef, useCallback } from "react";
import Webcam from "react-webcam";

const VIDEO_CONSTRAINTS = {
  width: 640,
  height: 480,
  facingMode: "user",
};

/**
 * WebcamCapture – renders the live webcam feed and exposes a capture function.
 *
 * Props:
 *  - onCapture(imageSrc: string) – called with base64 image data-URI
 *  - isDetecting: bool – shows a pulsing ring when true
 */
export default function WebcamCapture({ onCapture, isDetecting }) {
  const webcamRef = useRef(null);

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) onCapture(imageSrc);
  }, [onCapture]);

  return (
    <div className="relative flex flex-col items-center gap-4">
      {/* Camera frame */}
      <div
        className={`relative rounded-2xl overflow-hidden border-2 transition-all duration-500 ${
          isDetecting
            ? "border-purple-500 shadow-[0_0_30px_rgba(168,85,247,0.5)]"
            : "border-dark-600"
        }`}
      >
        <Webcam
          ref={webcamRef}
          screenshotFormat="image/jpeg"
          videoConstraints={VIDEO_CONSTRAINTS}
          className="rounded-2xl"
          width={480}
          height={360}
          mirrored
        />

        {/* Scanning overlay */}
        {isDetecting && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-40 h-40 rounded-full border-4 border-purple-400 opacity-60 animate-ping" />
          </div>
        )}
      </div>

      <button className="btn-primary w-full max-w-xs" onClick={capture}>
        📸 Capture &amp; Detect Emotion
      </button>
    </div>
  );
}
