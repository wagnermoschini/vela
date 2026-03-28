use tauri_plugin_shell::ShellExt;
use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize)]
struct McpRequest {
    action: String,
    params: serde_json::Value,
}

#[derive(Serialize, Deserialize)]
struct McpResponse {
    status: String,
    data: serde_json::Value,
    message: Option<String>,
}

#[tauri::command]
async fn call_mcp_tool(app: tauri::AppHandle, request: McpRequest) -> Result<McpResponse, String> {
    let sidecar_command = app.shell().sidecar("python/mcp_sidecar")
        .map_err(|e| format!("Failed to create sidecar command: {}", e))?;

    // In a real implementation with persistent sidecar, we would keep the process alive.
    // For this initial integration, we'll run it per-request for simplicity, 
    // or better, we logic it to talk to a running instance if we were to implement a full protocol.
    // However, the current mcp_sidecar.py is designed for a loop.
    
    // For now, let's treat it as a one-shot or a persistent bridge.
    // To make it persistent in a simple way for the user:
    let payload = serde_json::to_string(&request).map_err(|e| e.to_string())?;
    
    let output = sidecar_command
        .args([payload])
        .output()
        .await
        .map_err(|e| format!("Failed to execute sidecar: {}", e))?;

    if !output.status.success() {
        return Err(format!("Sidecar exited with error: {}", String::from_utf8_lossy(&output.stderr)));
    }

    let response_str = String::from_utf8_lossy(&output.stdout);
    let response: McpResponse = serde_json::from_str(&response_str)
        .map_err(|e| format!("Failed to parse sidecar response: {}. Raw: {}", e, response_str))?;

    Ok(response)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![call_mcp_tool])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
