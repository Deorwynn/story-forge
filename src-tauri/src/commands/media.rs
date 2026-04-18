use std::fs;
use std::path::Path;
use tauri::Manager;

#[tauri::command]
pub async fn save_media_file(
    app_handle: tauri::AppHandle,
    source_path: String,
    entity_id: String,
    collection: String,
) -> Result<String, String> {
    // 1. Resolve the local AppData directory
    let mut target_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;

    // 2. Build the path: $APPDATA/assets/{collection}
    target_dir.push("assets");
    target_dir.push(&collection);

    // 3. Ensure the directory exists
    fs::create_dir_all(&target_dir).map_err(|e| e.to_string())?;

    let extension = Path::new(&source_path)
        .extension()
        .and_then(|ext| ext.to_str())
        .unwrap_or("png");

    let file_name = format!("{}.{}", entity_id, extension);
    target_dir.push(&file_name);

    // 4. Copy the file
    fs::copy(&source_path, &target_dir).map_err(|e| e.to_string())?;

    // 5. Return the relative path
    Ok(format!("{}/{}", collection, file_name))
}
