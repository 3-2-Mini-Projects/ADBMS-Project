"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import BarcodeGeneratorModal from "./BarcodeGeneratorModal";

interface CameraBarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
  continuous?: boolean;
  defaultDelayMs?: number;
}

export default function CameraBarcodeScannerModal({
  isOpen,
  onClose,
  onScan,
  continuous = false,
  defaultDelayMs = 2000,
}: CameraBarcodeScannerModalProps) {
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [isScanning, setIsScanning] = useState(false);
  const [lastScannedCode, setLastScannedCode] = useState<string>("");
  const [continuousMode, setContinuousMode] = useState(continuous);
  const [showBarcodeSheet, setShowBarcodeSheet] = useState(false);
  const [scanDelayMs, setScanDelayMs] = useState<number>(defaultDelayMs);
  const [isCooldown, setIsCooldown] = useState<boolean>(false);
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastScannedCodeRef = useRef<string>("");
  const lastScanTimeRef = useRef<number>(0);
  const isProcessingRef = useRef<boolean>(false);
  const cooldownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const scanDelayRef = useRef<number>(scanDelayMs);
  scanDelayRef.current = scanDelayMs;

  const continuousModeRef = useRef<boolean>(continuousMode);
  continuousModeRef.current = continuousMode;

  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const readerElementId = "html5-camera-barcode-reader";

  // Play a POS confirmation beep using Web Audio API
  const playBeep = useCallback(() => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(1760, audioCtx.currentTime); // High pitch supermarket beep
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.12);
    } catch {
      // Audio might be blocked if user hasn't interacted
    }
  }, []);

  const isStoppingRef = useRef<boolean>(false);

  const clearCooldownTimers = useCallback(() => {
    if (cooldownTimerRef.current) {
      clearTimeout(cooldownTimerRef.current);
      cooldownTimerRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    isProcessingRef.current = false;
    setIsCooldown(false);
    setCooldownRemaining(0);
  }, []);

  const stopScanner = useCallback(async () => {
    clearCooldownTimers();
    if (isStoppingRef.current) return;

    const instance = scannerRef.current;
    if (!instance) {
      setIsScanning(false);
      return;
    }

    isStoppingRef.current = true;
    scannerRef.current = null;
    setIsScanning(false);

    try {
      if (instance.isScanning) {
        try {
          await instance.stop();
        } catch {
          // Camera already released
        }
      }
      try {
        await instance.clear();
      } catch {
        // Container element was already unmounted
      }
    } catch {
      // Safe cleanup fallback
    } finally {
      isStoppingRef.current = false;
    }
  }, [clearCooldownTimers]);

  const startScanner = useCallback(async (cameraId?: string) => {
    setErrorMsg("");
    await stopScanner();

    try {
      const html5QrCode = new Html5Qrcode(readerElementId, {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.ITF,
          Html5QrcodeSupportedFormats.CODABAR,
        ],
        verbose: false,
      });

      scannerRef.current = html5QrCode;

      const config = {
        fps: 15,
        qrbox: { width: 280, height: 180 },
        aspectRatio: 1.333333,
      };

      const cameraConfig = cameraId
        ? { deviceId: { exact: cameraId } }
        : { facingMode: "environment" };

      await html5QrCode.start(
        cameraConfig,
        config,
        (decodedText: string) => {
          const rawCode = decodedText ? decodedText.trim() : "";
          if (!rawCode) return;

          // 1. If currently in cooldown or actively processing, immediately reject frame
          if (isProcessingRef.current) {
            return;
          }

          const now = Date.now();
          const currentDelay = scanDelayRef.current || 2000;
          const timeSinceLast = now - lastScanTimeRef.current;
          const isSameCode = rawCode === lastScannedCodeRef.current;

          // Enforce cooldown delay:
          // If scanning the exact same product barcode, require the full delay (e.g. 2s)
          // If scanning a different barcode, enforce a minimum 1.2s delay to prevent accidental fast doubles
          const requiredDelay = isSameCode ? currentDelay : Math.min(currentDelay, 1200);
          if (timeSinceLast < requiredDelay) {
            return;
          }

          // Immediately lock processing to prevent subsequent camera frames from double-firing
          isProcessingRef.current = true;
          lastScanTimeRef.current = now;
          lastScannedCodeRef.current = rawCode;

          playBeep();
          setLastScannedCode(rawCode);

          // Deliver scan to handler
          onScanRef.current(rawCode);

          if (!continuousModeRef.current) {
            stopScanner().then(() => onCloseRef.current());
            return;
          }

          // Continuous mode: activate cooldown UI and countdown timer
          setIsCooldown(true);
          const totalSeconds = currentDelay / 1000;
          setCooldownRemaining(totalSeconds);

          if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
          const startTime = Date.now();
          countdownIntervalRef.current = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const remaining = Math.max(0, (currentDelay - elapsed) / 1000);
            setCooldownRemaining(Math.round(remaining * 10) / 10);
            if (elapsed >= currentDelay) {
              if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
              countdownIntervalRef.current = null;
            }
          }, 100);

          if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);
          cooldownTimerRef.current = setTimeout(() => {
            isProcessingRef.current = false;
            setIsCooldown(false);
            setCooldownRemaining(0);
          }, currentDelay);
        },
        () => {
          // ignore scan frame misses
        }
      );

      setIsScanning(true);
    } catch (err: any) {
      console.warn("[Camera Scanner] Unable to start video stream:", err?.message || err);
      setErrorMsg(
        err?.message ||
          "Unable to access camera. Please allow camera permissions in your browser or select another video device."
      );
      setIsScanning(false);
    }
  }, [playBeep, stopScanner]);

  // Discover connected cameras
  useEffect(() => {
    if (!isOpen) {
      stopScanner();
      return;
    }

    let isMounted = true;

    Html5Qrcode.getCameras()
      .then((devices) => {
        if (!isMounted) return;
        if (devices && devices.length > 0) {
          setCameras(devices);
          const defaultCam = devices[devices.length - 1].id; // back camera or primary webcam
          setSelectedCameraId(defaultCam);
          startScanner(defaultCam);
        } else {
          setErrorMsg("No camera device found on this computer.");
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        console.warn("[Camera Scanner] Device query error:", err?.message || err);
        setErrorMsg("Camera permission denied or camera device is unavailable.");
      });

    return () => {
      isMounted = false;
      stopScanner();
    };
  }, [isOpen, startScanner, stopScanner]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div
        className="modal-box"
        style={{
          maxWidth: 560,
          width: "100%",
          padding: 24,
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 22 }}>📷</span>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: "var(--text-primary)" }}>
                Scan Barcode via Camera
              </h3>
              <p style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
                Hold the product barcode up to the camera
              </p>
            </div>
          </div>
          <button
            className="btn btn-ghost"
            style={{ padding: "4px 8px" }}
            onClick={() => {
              stopScanner();
              onClose();
            }}
          >
            ✕
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div
            style={{
              padding: "10px 14px",
              borderRadius: 8,
              background: "rgba(248, 81, 73, 0.15)",
              border: "1px solid rgba(248, 81, 73, 0.3)",
              color: "var(--accent-rose)",
              fontSize: 12,
            }}
          >
            ⚠️ {errorMsg}
          </div>
        )}

        {/* Controls Bar: Camera Selector, Delay Selector & Continuous Mode Switch */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 10,
            padding: "8px 12px",
            background: "var(--bg-card2)",
            borderRadius: 8,
            border: "1px solid var(--border)",
          }}
        >
          {cameras.length > 1 && (
            <div style={{ flex: "1 1 180px" }}>
              <select
                className="input"
                style={{ fontSize: 12, padding: "5px 8px", width: "100%" }}
                value={selectedCameraId}
                onChange={(e) => {
                  setSelectedCameraId(e.target.value);
                  startScanner(e.target.value);
                }}
              >
                {cameras.map((cam) => (
                  <option key={cam.id} value={cam.id}>
                    {cam.label || `Camera ${cam.id}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Delay Selector to prevent duplicate scans */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
            <span style={{ color: "var(--text-secondary)", fontWeight: 500 }}>⏱️ Delay:</span>
            <select
              className="input"
              style={{ fontSize: 12, padding: "4px 8px", width: "auto" }}
              value={scanDelayMs}
              onChange={(e) => setScanDelayMs(Number(e.target.value))}
              title="Pause delay between scans to prevent adding items multiple times"
            >
              <option value={1500}>1.5 sec</option>
              <option value={2000}>2.0 sec (Recommended)</option>
              <option value={2500}>2.5 sec</option>
              <option value={3000}>3.0 sec (Safe)</option>
            </select>
          </div>

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12,
              color: "var(--text-secondary)",
              cursor: "pointer",
              marginLeft: "auto",
              userSelect: "none",
            }}
          >
            <input
              type="checkbox"
              checked={continuousMode}
              onChange={(e) => setContinuousMode(e.target.checked)}
            />
            Continuous Mode
          </label>
        </div>

        {/* Live Camera Viewport */}
        <div
          style={{
            position: "relative",
            width: "100%",
            borderRadius: 12,
            overflow: "hidden",
            background: "#000",
            minHeight: 300,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: isCooldown
              ? "2px solid var(--accent-emerald)"
              : "1px solid var(--border)",
            transition: "border 0.2s ease",
          }}
        >
          {/* Target Element for html5-qrcode */}
          <div id={readerElementId} style={{ width: "100%" }} />

          {/* Scanning Box Overlay */}
          {isScanning && (
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                pointerEvents: "none",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 12,
              }}
            >
              <div
                style={{
                  width: 280,
                  height: 180,
                  border: isCooldown
                    ? "2px solid rgba(16, 185, 129, 0.9)"
                    : "2px dashed rgba(63, 185, 80, 0.7)",
                  borderRadius: 8,
                  position: "relative",
                  boxShadow: isCooldown
                    ? "0 0 16px rgba(16, 185, 129, 0.4), 0 0 0 9999px rgba(0, 0, 0, 0.4)"
                    : "0 0 0 9999px rgba(0, 0, 0, 0.35)",
                  transition: "all 0.2s ease",
                }}
              >
                {/* Laser line moving vertically when ready */}
                {!isCooldown ? (
                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      right: 0,
                      height: 2,
                      background: "rgba(248, 81, 73, 0.85)",
                      boxShadow: "0 0 8px #f85149",
                      animation: "shimmer 1.6s ease-in-out infinite alternate",
                      top: "50%",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "rgba(16, 185, 129, 0.15)",
                    }}
                  >
                    <span style={{ fontSize: 32 }}>✓</span>
                  </div>
                )}
              </div>

              {/* Status pill over the video */}
              <div
                style={{
                  padding: "4px 12px",
                  borderRadius: 20,
                  fontSize: 11.5,
                  fontWeight: 600,
                  background: isCooldown ? "rgba(16, 185, 129, 0.9)" : "rgba(0, 0, 0, 0.75)",
                  color: "#fff",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                {isCooldown ? (
                  <span>⏳ Cooldown: next scan ready in {cooldownRemaining.toFixed(1)}s</span>
                ) : (
                  <span>🟢 Ready to scan item</span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Last Scanned Feedback Banner */}
        {lastScannedCode && (
          <div
            style={{
              padding: "10px 14px",
              borderRadius: 8,
              background: isCooldown ? "rgba(16, 185, 129, 0.15)" : "rgba(16, 185, 129, 0.08)",
              border: "1px solid rgba(16, 185, 129, 0.3)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Last Scanned Barcode:</span>
              <span
                style={{
                  marginLeft: 8,
                  fontSize: 14,
                  fontWeight: 800,
                  color: "var(--accent-emerald)",
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                {lastScannedCode} ✓
              </span>
            </div>
            {isCooldown && (
              <span
                style={{
                  fontSize: 11,
                  padding: "2px 8px",
                  borderRadius: 12,
                  background: "rgba(16, 185, 129, 0.2)",
                  color: "var(--accent-emerald)",
                  fontWeight: 700,
                }}
              >
                Delay: {cooldownRemaining.toFixed(1)}s
              </span>
            )}
          </div>
        )}

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <button
            type="button"
            className="btn btn-ghost"
            style={{ fontSize: 11, padding: "5px 10px" }}
            onClick={() => setShowBarcodeSheet(true)}
            title="Display scannable barcodes for testing"
          >
            🏷️ Test Barcodes Sheet
          </button>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
              Cooldown prevents accidental double scans
            </span>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                stopScanner();
                onClose();
              }}
            >
              Done / Close
            </button>
          </div>
        </div>
      </div>

      {/* Barcode Sheet / Generator Modal */}
      {showBarcodeSheet && (
        <BarcodeGeneratorModal
          isOpen={showBarcodeSheet}
          onClose={() => setShowBarcodeSheet(false)}
        />
      )}
    </div>
  );
}
