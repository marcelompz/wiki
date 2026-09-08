use std::fs::File;
use std::io::Write;
use std::path::PathBuf;
use tauri::Manager;

#[derive(serde::Serialize, serde::Deserialize)]
pub struct PrintJob {
    pub content: String,
    pub printer_name: Option<String>,
}

#[derive(serde::Serialize, serde::Deserialize)]
pub struct PrintResult {
    pub success: bool,
    pub message: String,
}

// Path por defecto si no se especifica impresora ni la variable de entorno
// OMNIFLOW_PRINTER_PATH. /dev/usb/lp0 es específico de Linux (driver usblp);
// en Windows la impresora térmica normalmente se comparte como puerto de
// red/USB con nombre propio (ej. "\\\\.\\ticket-printer" o una IP:puerto si
// es una impresora de red) — configurar OMNIFLOW_PRINTER_PATH en ese caso.
fn default_printer_path() -> String {
    std::env::var("OMNIFLOW_PRINTER_PATH").unwrap_or_else(|_| "/dev/usb/lp0".to_string())
}

#[tauri::command]
fn print_escpos(job: PrintJob) -> PrintResult {
    let printer_name = job.printer_name.as_deref().unwrap_or("default");
    let path = match printer_name {
        "default" => PathBuf::from(default_printer_path()),
        _ => PathBuf::from(printer_name),
    };

    if !path.exists() {
        return PrintResult {
            success: false,
            message: format!(
                "No se encontró la impresora en {}. Verificá que esté conectada y encendida, o configurá OMNIFLOW_PRINTER_PATH.",
                path.display()
            ),
        };
    }

    match File::create(&path) {
        Ok(mut file) => match file.write_all(job.content.as_bytes()) {
            Ok(_) => match file.flush() {
                Ok(_) => PrintResult {
                    success: true,
                    message: format!("Impreso en {}", path.display()),
                },
                Err(e) => PrintResult {
                    success: false,
                    message: format!("Error al vaciar el buffer de impresión: {}", e),
                },
            },
            Err(e) => PrintResult {
                success: false,
                message: format!("Error escribiendo en impresora: {}", e),
            },
        },
        Err(e) => PrintResult {
            success: false,
            message: format!("No se pudo abrir {}: {}", path.display(), e),
        },
    }
}

#[tauri::command]
fn toggle_fullscreen(window: tauri::Window) {
    let _ = window.set_fullscreen(!window.is_fullscreen().unwrap_or(false));
}

#[tauri::command]
fn set_always_on_top(window: tauri::Window, on_top: bool) {
    let _ = window.set_always_on_top(on_top);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![print_escpos, toggle_fullscreen, set_always_on_top])
        .setup(|app| {
            let window = app.get_webview_window("main").unwrap();
            let _ = window.set_title("OrderFlow POS");
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
