"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import BarcodeGeneratorModal from "./BarcodeGeneratorModal";

interface CameraBarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
  continuous?: boolean;
}

export default function CameraBarcodeScannerModal({
  isOpen,
  onClose,
  onScan,
  continuous = false,
}: CameraBarcodeScannerModalProps) {
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [isScanning, setIsScanning] = useState(false);
  const [lastScannedCode, setLastScannedCode] = useState<string>("");
  const [continuousMode, setContinuousMode] = useState(continuous);
  const [showBarcodeSheet, setShowBarcodeSheet] = useState(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastScanTimeRef = useRef<number>(0);
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

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        await scannerRef.current.clear();
      } catch (err) {
        console.warn("Failed to stop scanner cleanly", err);
      } finally {
        scannerRef.current = null;
        setIsScanning(false);
      }
    }
  }, []);

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
          const now = Date.now();
          // 1.5s debounce for continuous scanning of the same item
          if (decodedText === lastScanTimeRef.current.toString() && now - lastScanTimeRef.current < 1500) {
            return;
          }
          lastScanTimeRef.current = now;

          playBeep();
          setLastScannedCode(decodedText);
          onScan(decodedText.trim());

          if (!continuousMode) {
            stopScanner().then(() => onClose());
          }
        },
        () => {
          // ignore scan frame misses
        }
      );

      setIsScanning(true);
    } catch (err: any) {
      console.error("Camera scanner start error:", err);
      setErrorMsg(
        err?.message ||
          "Unable to access camera. Please allow camera permissions in your browser or select another video device."
      );
      setIsScanning(false);
    }
  }, [continuousMode, onClose, onScan, playBeep, stopScanner]);

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
        console.error("Error getting cameras", err);
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
          maxWidth: 540,
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

        {/* Camera Selector & Continuous Mode Switch */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          {cameras.length > 1 && (
            <div style={{ flex: 1 }}>
              <select
                className="input"
                style={{ fontSize: 12, padding: "6px 10px" }}
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

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12,
              color: "var(--text-secondary)",
              cursor: "pointer",
              marginLeft: "auto",
            }}
          >
            <input
              type="checkbox"
              checked={continuousMode}
              onChange={(e) => setContinuousMode(e.target.checked)}
            />
            Continuous Scan Mode
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
            border: "1px solid var(--border)",
          }}
        >
          {/* Target Element for html5-qrcode */}
          <div id={readerElementId} style={{ width: "100%" }} />

          {/* Visual Red Laser Scan Animation Overlay */}
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
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  width: 280,
                  height: 180,
                  border: "2px dashed rgba(63, 185, 80, 0.7)",
                  borderRadius: 8,
                  position: "relative",
                  boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.35)",
                }}
              >
                {/* Laser line moving vertically */}
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
              background: "rgba(16, 185, 129, 0.12)",
              border: "1px solid rgba(16, 185, 129, 0.3)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Last Scanned Barcode:</span>
            <span
              style={{
                fontSize: 14,
                fontWeight: 800,
                color: "var(--accent-emerald)",
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              {lastScannedCode} ✓
            </span>
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
              Supports EAN-13, EAN-8, Code-128, Code-39, UPC-A, QR
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
