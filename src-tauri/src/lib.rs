use std::fs;

#[tauri::command]
fn save_character_to_disk(id: String, json_data: String) -> Result<(), String> {
    let filename = format!("{}.json", id);
    fs::write(filename, json_data).map_err(|e| e.to_string())?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![save_character_to_disk]) // Register the command
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}