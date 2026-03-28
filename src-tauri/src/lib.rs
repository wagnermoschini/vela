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
async fn save_env_key(key: String, value: String) -> Result<(), String> {
    use std::fs;
    use std::io::{Write, Read};
    
    let mut env_path = std::env::current_dir()
        .map_err(|e| e.to_string())?;
    
    // Se estivermos em src-tauri (comum no dev), salvamos na raiz do projeto (um nível acima)
    if env_path.ends_with("src-tauri") {
        env_path = env_path.parent().unwrap().to_path_buf();
    }
    
    let env_path = env_path.join(".env");
        
    let mut content = String::new();
    if env_path.exists() {
        let mut file = fs::File::open(&env_path).map_err(|e| e.to_string())?;
        file.read_to_string(&mut content).map_err(|e| e.to_string())?;
    }
    
    let mut lines: Vec<String> = content.lines().map(|s| s.to_string()).collect();
    let mut found = false;
    let new_line = format!("{}={}", key, value);
    
    for line in lines.iter_mut() {
        if line.starts_with(&format!("{}=", key)) {
            *line = new_line.clone();
            found = true;
            break;
        }
    }
    
    if !found {
        lines.push(new_line);
    }
    
    let mut file = fs::File::create(&env_path).map_err(|e| e.to_string())?;
    file.write_all(lines.join("\n").as_bytes()).map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
async fn call_mcp_tool(app: tauri::AppHandle, request: McpRequest) -> Result<McpResponse, String> {
    let sidecar_command = app.shell().sidecar("mcp_sidecar")
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
        .map_err(|e| {
            let err_msg = format!("Failed to execute sidecar: {}", e);
            println!("[ERROR] {}", err_msg);
            err_msg
        })?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        let err_msg = format!("Sidecar exited with error: {}", stderr);
        println!("[ERROR] {}", err_msg);
        return Err(err_msg);
    }

    let response_str = String::from_utf8_lossy(&output.stdout);
    println!("[DEBUG] Sidecar raw response: {}", response_str);
    
    let response: McpResponse = serde_json::from_str(&response_str)
        .map_err(|e| {
            let err_msg = format!("Failed to parse response: {}. Raw: {}", e, response_str);
            println!("[ERROR] {}", err_msg);
            err_msg
        })?;

    Ok(response)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![call_mcp_tool, save_env_key])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
