use rusqlite::{Connection, params};
use tauri::Manager;
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(serde::Serialize, serde::Deserialize)]
struct BookRow {
    id: String,
    title: String,
    order_index: i32,
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct ProjectRow {
id: String,
    name: String,
    project_type: String,
    book_count: i32,
    genre: String,
    description: String,
    created_at: i64,
    updated_at: i64,
    books: Vec<BookRow>,
}

fn init_db(app_handle: &tauri::AppHandle) -> Result<(), String> {
    let path = get_db_path(app_handle)?;
    let conn = Connection::open(path).map_err(|e| e.to_string())?;

    let _ : String = conn.query_row("PRAGMA journal_mode = WAL", [], |row| row.get(0)).map_err(|e| e.to_string())?;

    // Get current version
    let current_version: i32 = conn
        .query_row("PRAGMA user_version", [], |row| row.get(0))
        .map_err(|e| e.to_string())?;

    // Migration: Version 0 -> 1 (Initial Tables)
    if current_version < 1 {
        conn.execute_batch(
            "BEGIN;
             -- Added 'IF NOT EXISTS' to prevent the crash you just saw
             CREATE TABLE IF NOT EXISTS projects (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                type TEXT NOT NULL,
                book_count INTEGER DEFAULT 1,
                created_at INTEGER
             );
             CREATE TABLE IF NOT EXISTS characters (
                id TEXT PRIMARY KEY,
                project_id TEXT NOT NULL,
                name TEXT NOT NULL,
                role TEXT,
                FOREIGN KEY(project_id) REFERENCES projects(id)
             );
             PRAGMA user_version = 1;
             COMMIT;"
        ).map_err(|e| e.to_string())?;
    }

    // Migration: Version 1 -> 2
    if current_version < 2 {
        conn.execute_batch(
            "BEGIN;
             ALTER TABLE projects ADD COLUMN genre TEXT DEFAULT 'Uncategorized';
             ALTER TABLE projects ADD COLUMN description TEXT DEFAULT '';
             PRAGMA user_version = 2;
             COMMIT;"
        ).map_err(|e| e.to_string())?;
    }

    if current_version < 3 {
    conn.execute_batch(
        "BEGIN;
         CREATE TABLE IF NOT EXISTS books (
            id TEXT PRIMARY KEY,
            project_id TEXT NOT NULL,
            title TEXT NOT NULL,
            description TEXT DEFAULT '',
            order_index INTEGER NOT NULL,
            FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
         );
         PRAGMA user_version = 3;
         COMMIT;"
    ).map_err(|e| e.to_string())?;
}

if current_version < 4 {
    conn.execute_batch(
        "BEGIN;
         -- Add management columns to projects
         ALTER TABLE projects ADD COLUMN updated_at INTEGER;
         ALTER TABLE projects ADD COLUMN deleted_at INTEGER; -- For the Trash system
         
         -- Add progress tracking to books
         ALTER TABLE books ADD COLUMN status TEXT DEFAULT 'Planning';
         ALTER TABLE books ADD COLUMN target_word_count INTEGER DEFAULT 50000;
         
         -- Update existing rows to have a timestamp
         UPDATE projects SET updated_at = strftime('%s', 'now') WHERE updated_at IS NULL;
         
         PRAGMA user_version = 4;
         COMMIT;"
    ).map_err(|e| e.to_string())?;
}

if current_version < 5 {
    conn.execute_batch(
        "BEGIN;
         CREATE TABLE IF NOT EXISTS documents (
            id TEXT PRIMARY KEY,
            project_id TEXT NOT NULL,
            book_id TEXT, 
            parent_id TEXT, -- Allows for 'Revisions' of a 'Draft'
            title TEXT NOT NULL,
            content TEXT DEFAULT '',
            doc_type TEXT NOT NULL, -- 'plot', 'chapter', 'note', 'brainstorm'
            version INTEGER DEFAULT 1,
            is_archived BOOLEAN DEFAULT 0, -- For old revisions
            order_index INTEGER NOT NULL,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE,
            FOREIGN KEY(book_id) REFERENCES books(id) ON DELETE CASCADE,
            FOREIGN KEY(parent_id) REFERENCES documents(id) ON DELETE CASCADE
         );
         PRAGMA user_version = 5;
         COMMIT;"
    ).map_err(|e| e.to_string())?;
}

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
    book_count: i32,
    genre: String,  
    description: String,
) -> Result<(), String> {
    let path = get_db_path(&app_handle)?;
    let conn = Connection::open(path).map_err(|e| e.to_string())?;

    let _ : String = conn.query_row("PRAGMA journal_mode = WAL", [], |row| row.get(0)).map_err(|e| e.to_string())?;

    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e: std::time::SystemTimeError| e.to_string())?
        .as_secs() as i64;
    
    conn.execute(
        "INSERT INTO projects (id, name, type, book_count, created_at, updated_at, genre, description) 
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        (id, name, project_type, book_count, now, now, genre, description),
    ).map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
async fn create_book(
    app_handle: tauri::AppHandle,
    id: String,
    project_id: String,
    title: String,
    order_index: i32,
) -> Result<(), String> {
    let path = get_db_path(&app_handle)?;
    let conn = Connection::open(path).map_err(|e| e.to_string())?;

    let _ : String = conn.query_row("PRAGMA journal_mode = WAL", [], |row| row.get(0)).map_err(|e| e.to_string())?;

    conn.execute(
        "INSERT INTO books (id, project_id, title, order_index) VALUES (?1, ?2, ?3, ?4)",
        (id, project_id, title, order_index),
    ).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
async fn get_projects(app_handle: tauri::AppHandle) -> Result<Vec<ProjectRow>, String> {
    let path = get_db_path(&app_handle)?;
    let conn = Connection::open(path).map_err(|e| e.to_string())?;

    let mut stmt = conn.prepare(
        "SELECT 
            p.id, p.name, p.type, p.book_count, p.genre, p.description, p.created_at, p.updated_at,
            COALESCE(
                (SELECT json_group_array(
                    json_object('id', b.id, 'title', b.title, 'order_index', b.order_index)
                ) FROM books b WHERE b.project_id = p.id),
                '[]'
            ) as books_json
         FROM projects p
         WHERE p.deleted_at IS NULL
         ORDER BY p.updated_at DESC"
    ).map_err(|e| e.to_string())?;

    let project_rows = stmt.query_map([], |row| {
        // Parse the JSON string back into our BookRow vector
        let books_json: String = row.get(8)?;
        let books: Vec<BookRow> = serde_json::from_str(&books_json)
            .map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))?;

        Ok(ProjectRow {
            id: row.get(0)?,
            name: row.get(1)?,
            project_type: row.get(2)?,
            book_count: row.get(3)?,
            genre: row.get(4)?,
            description: row.get(5)?,
            created_at: row.get::<_, Option<i64>>(6)?.unwrap_or(0), 
            updated_at: row.get::<_, Option<i64>>(7)?.unwrap_or(0),
            books,
        })
    }).map_err(|e| e.to_string())?;

    let mut projects = Vec::new();
    for project in project_rows {
        projects.push(project.map_err(|e| e.to_string())?);
    }

    Ok(projects)
}

#[tauri::command]
async fn delete_project(app_handle: tauri::AppHandle, id: String) -> Result<(), String> {
    let path = get_db_path(&app_handle)?;
    let conn = Connection::open(path).map_err(|e| e.to_string())?;
    
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_secs() as i64;
    
    conn.execute(
        "UPDATE projects SET deleted_at = ?1 WHERE id = ?2",
        params![now, id],
    ).map_err(|e| e.to_string())?;

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            init_db(app.handle())?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![create_project, get_projects, create_book, delete_project])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}