use std::fs;
use std::path::Path;
use tauri::Manager;

use std::time::{SystemTime, UNIX_EPOCH};

#[tauri::command]
pub async fn save_media_file(
    app_handle: tauri::AppHandle,
    source_path: String,
    entity_id: String,
    collection: String,
) -> Result<String, String> {
    let mut target_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;

    target_dir.push("assets");
    target_dir.push(&collection);

    fs::create_dir_all(&target_dir).map_err(|e| e.to_string())?;

    let extension = Path::new(&source_path)
        .extension()
        .and_then(|ext| ext.to_str())
        .unwrap_or("png");

    // --- Add a timestamp to the filename ---
    let start = SystemTime::now();
    let since_the_epoch = start
        .duration_since(UNIX_EPOCH)
        .map_err(|e| e.to_string())?;
    let timestamp = since_the_epoch.as_secs();

    // Filename becomes: {entity_id}_{timestamp}.{extension}
    let file_name = format!("{}_{}.{}", entity_id, timestamp, extension);
    // ------------------------------------------------
    
    target_dir.push(&file_name);

    fs::copy(&source_path, &target_dir).map_err(|e| e.to_string())?;

    Ok(format!("{}/{}", collection, file_name))
}

pub fn internal_delete_asset_file(app_handle: &tauri::AppHandle, relative_path: &str) -> Result<(), String> {
    let mut path = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;
    
    path.push("assets");
    path.push(relative_path);

    if path.exists() {
        fs::remove_file(path).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command(rename_all = "snake_case")]
pub async fn delete_asset_file(
    app_handle: tauri::AppHandle, 
    relative_path: String
) -> Result<(), String> {
    internal_delete_asset_file(&app_handle, &relative_path)
}
