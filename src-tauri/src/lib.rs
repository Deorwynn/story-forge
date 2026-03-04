use rusqlite::Connection;
use tauri::Manager;

#[derive(serde::Serialize)]
struct BookRow {
    id: String,
    title: String,
    order_index: i32,
}

#[derive(serde::Serialize)]
struct ProjectRow {
    id: String,
    name: String,
    project_type: String,
    book_count: i32,
    genre: String,
    description: String,
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
    
    conn.execute(
        "INSERT INTO projects (id, name, type, book_count, created_at, genre, description) 
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        (id, name, project_type, book_count, 0, genre, description),
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

    let _ : String = conn.query_row("PRAGMA journal_mode = WAL", [], |row| row.get(0)).map_err(|e| e.to_string())?;

    // Get all projects
    let mut stmt = conn.prepare("SELECT id, name, type, book_count, genre, description FROM projects WHERE deleted_at IS NULL")
    .map_err(|e| e.to_string())?;
    let project_rows = stmt.query_map([], |row| {
        let project_id: String = row.get(0)?;
        
        // For each project, fetch its associated books
        let mut book_stmt = conn.prepare("SELECT id, title, order_index FROM books WHERE project_id = ?1 ORDER BY order_index ASC")
            .map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))?;
        
        let book_iter = book_stmt.query_map([&project_id], |b_row| {
            Ok(BookRow {
                id: b_row.get(0)?,
                title: b_row.get(1)?,
                order_index: b_row.get(2)?,
            })
        }).map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))?;

        let mut books = Vec::new();
        for book in book_iter {
            books.push(book?);
        }

        Ok(ProjectRow {
            id: project_id,
            name: row.get(1)?,
            project_type: row.get(2)?,
            book_count: row.get(3)?,
            genre: row.get(4)?,
            description: row.get(5)?,
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

    let _ : String = conn.query_row("PRAGMA journal_mode = WAL", [], |row| row.get(0)).map_err(|e| e.to_string())?;

    conn.execute(
        "UPDATE projects SET deleted_at = strftime('%s', 'now') WHERE id = ?1",
        [id],
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