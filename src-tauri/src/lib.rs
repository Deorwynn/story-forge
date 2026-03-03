use rusqlite::Connection;
use tauri::Manager;
use std::fs;

#[derive(serde::Serialize)]
struct ProjectRow {
    id: String,
    name: String,
    project_type: String,
    book_count: i32,
}

fn init_db(app_handle: &tauri::AppHandle) -> Result<(), String> {
    let mut path = app_handle.path().app_data_dir().map_err(|e: tauri::Error| e.to_string())?;
    fs::create_dir_all(&path).map_err(|e: std::io::Error| e.to_string())?;
    path.push("storyforge.db");

    // Explicitly type the error as rusqlite::Error
    let conn = Connection::open(path).map_err(|e: rusqlite::Error| e.to_string())?;
    
    conn.execute(
        "CREATE TABLE IF NOT EXISTS projects (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            type TEXT NOT NULL,
            book_count INTEGER,
            created_at INTEGER
        )",
        (),
    ).map_err(|e: rusqlite::Error| e.to_string())?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS characters (
            id TEXT PRIMARY KEY,
            project_id TEXT NOT NULL,
            name TEXT NOT NULL,
            role TEXT,
            FOREIGN KEY(project_id) REFERENCES projects(id)
        )",
        (),
    ).map_err(|e: rusqlite::Error| e.to_string())?;

    Ok(())
}

fn get_db_path(app_handle: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    let mut path = app_handle.path().app_data_dir().map_err(|e| e.to_string())?;
    path.push("storyforge.db");
    Ok(path)
}

#[tauri::command]
async fn create_project(
    app_handle: tauri::AppHandle, 
    id: String, 
    name: String, 
    project_type: String, 
    book_count: i32
) -> Result<(), String> {
    let path = get_db_path(&app_handle)?;
    let conn = Connection::open(path).map_err(|e: rusqlite::Error| e.to_string())?;
    
    // Using SystemTime for a quick real timestamp without extra crates
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();

    conn.execute(
        "INSERT INTO projects (id, name, type, book_count, created_at) VALUES (?1, ?2, ?3, ?4, ?5)",
        (id, name, project_type, book_count, now as i64),
    ).map_err(|e: rusqlite::Error| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
async fn get_projects(app_handle: tauri::AppHandle) -> Result<Vec<ProjectRow>, String> {
    let mut path = app_handle.path().app_data_dir().map_err(|e: tauri::Error| e.to_string())?;
    path.push("storyforge.db");
    
    let conn = Connection::open(path).map_err(|e: rusqlite::Error| e.to_string())?;
    
    let mut stmt = conn.prepare("SELECT id, name, type, book_count FROM projects")
        .map_err(|e: rusqlite::Error| e.to_string())?;
    
    let project_iter = stmt.query_map([], |row| {
        Ok(ProjectRow {
            id: row.get(0)?,
            name: row.get(1)?,
            project_type: row.get(2)?,
            book_count: row.get(3)?,
        })
    }).map_err(|e: rusqlite::Error| e.to_string())?;

    let mut projects = Vec::new();
    for project in project_iter {
        projects.push(project.map_err(|e: rusqlite::Error| e.to_string())?);
    }
    
    Ok(projects)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            init_db(app.handle())?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![create_project, get_projects]) // Register the command
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}