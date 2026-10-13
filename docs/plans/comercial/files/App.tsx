import React, { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { appWindow } from "@tauri-apps/api/window";
import { formatTicketEscPos, TicketPayload } from "./escpos";

const POS_URL = import.meta.env.VITE_POS_URL || "https://pesallaccia.com/admin/pos";

interface PrintResult {
  success: boolean;
  message: string;
}

// Orígenes desde los que aceptamos mensajes del iframe del POS web.
// Ajustar si el POS se sirve desde otro dominio/puerto.
const ALLOWED_ORIGINS = [
  new URL(POS_URL).origin,
  "http://localhost:5173",
  "http://localhost:3000",
];

export default function App() {
  const [ready, setReady] = useState(false);
  const [lastShortcut, setLastShortcut] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastPrintStatus, setLastPrintStatus] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        await appWindow.setTitle("OmniFlow POS");
      } catch (e) {
        console.error("Error initializing native features:", e);
        setError(`Init error: ${e}`);
      }
      setReady(true);
    };

    init();
  }, []);

  // Puente iframe (POS web) -> shell nativo: escucha pedidos de impresión
  // enviados por pos.tsx via window.parent.postMessage(...) y los manda a
  // la impresora física real a través del comando Tauri print_escpos.
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (!ALLOWED_ORIGINS.includes(event.origin)) {
        console.warn("Mensaje ignorado, origen no permitido:", event.origin);
        return;
      }

      const data = event.data;
      if (!data || data.type !== "omniflow:print-ticket") return;

      const payload = data.payload as TicketPayload;

      try {
        const content = formatTicketEscPos(payload);
        const result = await invoke<PrintResult>("print_escpos", {
          job: { content, printerName: "default" },
        });

        setLastPrintStatus(result.success ? "✅ Ticket impreso" : `⚠️ ${result.message}`);
        if (!result.success) {
          console.error("Fallo al imprimir ticket:", result.message);
        }
      } catch (e) {
        console.error("Error imprimiendo ticket:", e);
        setLastPrintStatus(`⚠️ Error al imprimir: ${e}`);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const handlePrint = async () => {
    try {
      const result = await invoke<PrintResult>("print_escpos", {
        job: {
          content: "\x1B\x40\n\x1B\x61\x01\n\x1B\x45\x01OmniFlow POS\x1B\x46\n\x1B\x61\x00\n\x1B\x64\x05\n",
          printerName: "default",
        },
      });
      console.log("Print result:", result);
      alert(result.message);
    } catch (e) {
      console.error("Print error:", e);
      setError(`Print error: ${e}`);
      alert("Error al imprimir: " + e);
    }
  };

  const toggleFullscreen = async () => {
    try {
      await invoke("toggle_fullscreen");
    } catch (e) {
      console.error("Fullscreen error:", e);
      setError(`Fullscreen error: ${e}`);
    }
  };

  const toggleAlwaysOnTop = async () => {
    try {
      await invoke("set_always_on_top", { onTop: true });
    } catch (e) {
      console.error("Always on top error:", e);
      setError(`Always on top error: ${e}`);
    }
  };

  if (!ready) {
    return (
      <div
        style={{
          width: "100vw",
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f0f2f5",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🏪</div>
          <div style={{ fontSize: 18, color: "#666" }}>Cargando OmniFlow POS...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: "100vw", height: "100vh", display: "flex", flexDirection: "column" }}>
      <div
        style={{
          padding: "8px 16px",
          background: "#001529",
          color: "#fff",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: 12,
        }}
      >
        <div>OmniFlow POS Desktop</div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={toggleFullscreen}>⛶ Pantalla completa</button>
          <button onClick={toggleAlwaysOnTop}>📌 Fijar ventana</button>
          <button onClick={handlePrint}>🖨️ Probar impresión</button>
          {lastPrintStatus && <span>{lastPrintStatus}</span>}
          {lastShortcut && <span>Shortcut: {lastShortcut}</span>}
          {error && <span style={{ color: "#ff4444" }}>{error}</span>}
        </div>
      </div>
      <iframe
        src={POS_URL}
        style={{ flex: 1, border: "none" }}
        title="OmniFlow POS"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      />
    </div>
  );
}
