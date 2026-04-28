use std::fs;
use tauri::Manager;
use image::GenericImageView;
use std::time::{SystemTime, UNIX_EPOCH};

pub fn internal_process_image(
    app_handle: &tauri::AppHandle,
    source_path: &str,
    entity_id: &str,
    collection: &str,
    entity_type: &str,
) -> Result<String, String> {
    let img = image::open(source_path)
        .map_err(|e| format!("Invalid image file: {}", e))?;

    let max_dim = if entity_type == "portrait" { 1000.0 } else { 1600.0 };
    let (width, height) = img.dimensions();

    let processed = if width as f32 > max_dim || height as f32 > max_dim {
        img.resize(max_dim as u32, max_dim as u32, image::imageops::FilterType::Lanczos3)
    } else {
        img
    };

    // Prepare Path
    let mut target_dir = app_handle.path().app_data_dir().map_err(|e| e.to_string())?;
    target_dir.push("assets");
    target_dir.push(collection);
    fs::create_dir_all(&target_dir).map_err(|e| e.to_string())?;

    let timestamp = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs();
    let file_name = format!("{}_{}.webp", entity_id, timestamp);
    target_dir.push(&file_name);

    // Save as optimized WebP
    processed
        .save_with_format(&target_dir, image::ImageFormat::WebP)
        .map_err(|e| format!("Failed to save: {}", e))?;

    Ok(format!("{}/{}", collection, file_name))
}

#[tauri::command]
pub async fn upload_and_optimize_image(
    app_handle: tauri::AppHandle,
    source_path: String,
    entity_id: String,
    collection: String,
    entity_type: String,
) -> Result<String, String> {
    internal_process_image(&app_handle, &source_path, &entity_id, &collection, &entity_type)
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