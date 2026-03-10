use rusqlite::{Connection, params};
use tauri::Manager;
use std::time::{SystemTime, UNIX_EPOCH};
use uuid::Uuid;
use std::sync::Mutex;

struct AppState {
    db: Mutex<rusqlite::Connection>,
}

#[derive(serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
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
    series_name: String,
    volume_number: i32,
    project_type: String,
    book_count: i32,
    genre: String,
    description: String,
    created_at: i64,
    updated_at: i64,
    books: Vec<BookRow>,
}

#[derive(serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct ManuscriptDoc {
    id: String,
    project_id: String,
    book_id: Option<String>,
    parent_id: Option<String>,
    title: String,
    content: String,
    doc_type: String, // 'plot', 'chapter', 'note'
    version: i32,
    is_archived: bool,
    order_index: i32,
    created_at: i64,
    updated_at: i64,
}

fn init_db(app_handle: &tauri::AppHandle) -> Result<Connection, String> {
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

if current_version < 6 {
    conn.execute_batch(
        "BEGIN;
        ALTER TABLE projects ADD COLUMN series_name TEXT DEFAULT '';
        ALTER TABLE projects ADD COLUMN volume_number INTEGER DEFAULT 1;
        PRAGMA user_version = 6;
        COMMIT;"
    ).map_err(|e| e.to_string())?;
}

    Ok(conn)
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
    series_name: String,
    volume_number: i32,
    project_type: String, 
    book_count: i32,
    genre: String,
    description: String,
) -> Result<(), String> {
    let path = get_db_path(&app_handle)?;
    let conn = Connection::open(path).map_err(|e| e.to_string())?;

    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_secs() as i64;

    conn.execute(
        "INSERT INTO projects (id, name, series_name, volume_number, type, book_count, created_at, updated_at, genre, description) 
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
        (id, name, series_name, volume_number, project_type, book_count, now, now, genre, description),
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

#[tauri::command(rename_all = "snake_case")]
async fn create_document(
    state: tauri::State<'_, AppState>,
    project_id: String,
    book_id: String,
    parent_id: Option<String>,
    doc_type: String,
) -> Result<ManuscriptDoc, String> {
    let conn = state.db.lock().unwrap();
    let id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().timestamp();

    // Calculate the next order_index
    // find the current max index for the same parent and book
    let next_index: i32 = conn
        .query_row(
            "SELECT COALESCE(MAX(order_index), -1) + 1 
             FROM documents 
             WHERE book_id = ?1 AND parent_id IS ?2",
            params![book_id, parent_id],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    let doc = ManuscriptDoc {
        id: id.clone(),
        project_id,
        book_id: Some(book_id),
        parent_id,
        title: if doc_type == "chapter" { "New Chapter".into() } else { "New Scene".into() },
        content: "".into(),
        doc_type,
        version: 1,
        is_archived: false,
        order_index: next_index,
        created_at: now,
        updated_at: now,
    };

    // Insert into DB
    conn.execute(
        "INSERT INTO documents (id, project_id, book_id, parent_id, title, content, doc_type, version, is_archived, order_index, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
        params![
            doc.id, doc.project_id, doc.book_id, doc.parent_id, 
            doc.title, doc.content, doc.doc_type, doc.version, 
            doc.is_archived, doc.order_index, doc.created_at, doc.updated_at
        ],
    ).map_err(|e| e.to_string())?;

    Ok(doc)
}

#[tauri::command]
async fn get_projects(app_handle: tauri::AppHandle) -> Result<Vec<ProjectRow>, String> {
    let path = get_db_path(&app_handle)?;
    let conn = Connection::open(path).map_err(|e| e.to_string())?;

    let mut stmt = conn.prepare(
        "SELECT 
            p.id, p.name, p.series_name, p.volume_number, p.type, p.book_count, p.genre, p.description, p.created_at, p.updated_at,
            COALESCE(
                (SELECT json_group_array(
                    json_object('id', b.id, 'title', b.title, 'orderIndex', b.order_index)
                ) FROM books b WHERE b.project_id = p.id),
                '[]'
            ) as books_json
        FROM projects p
        WHERE p.deleted_at IS NULL
        ORDER BY p.updated_at DESC"
    ).map_err(|e| e.to_string())?;

    let project_rows = stmt.query_map([], |row| {
        // Parse the JSON string back into our BookRow vector
        let books_json: String = row.get(10)?; 
        let books: Vec<BookRow> = serde_json::from_str(&books_json)
            .map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))?;

        Ok(ProjectRow {
            id: row.get(0)?,
            name: row.get(1)?,
            series_name: row.get::<_, Option<String>>(2)?.unwrap_or_default(),
            volume_number: row.get::<_, Option<i32>>(3)?.unwrap_or(1),
            project_type: row.get(4)?,
            book_count: row.get(5)?,
            genre: row.get(6)?,
            description: row.get(7)?,
            created_at: row.get::<_, Option<i64>>(8)?.unwrap_or(0), 
            updated_at: row.get::<_, Option<i64>>(9)?.unwrap_or(0),
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
async fn get_project_by_id(app_handle: tauri::AppHandle, id: String) -> Result<ProjectRow, String> {
    let path = get_db_path(&app_handle)?;
    let conn = Connection::open(path).map_err(|e| e.to_string())?;

    let mut stmt = conn.prepare(
        "SELECT 
            p.id, p.name, p.series_name, p.volume_number, p.type, p.book_count, p.genre, p.description, p.created_at, p.updated_at,
            COALESCE(
                (SELECT json_group_array(
                    json_object('id', b.id, 'title', b.title, 'order_index', b.order_index)
                ) FROM books b WHERE b.project_id = p.id),
                '[]'
            ) as books_json
        FROM projects p
        WHERE p.id = ?1"
    ).map_err(|e| e.to_string())?;

    let project = stmt.query_row([id], |row| {
        let books_json: String = row.get(10)?; 
        let books: Vec<BookRow> = serde_json::from_str(&books_json)
            .map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))?;

        Ok(ProjectRow {
            id: row.get(0)?,
            name: row.get(1)?,
            series_name: row.get::<_, Option<String>>(2)?.unwrap_or_default(),
            volume_number: row.get::<_, Option<i32>>(3)?.unwrap_or(1),
            project_type: row.get(4)?,
            book_count: row.get(5)?,
            genre: row.get(6)?,
            description: row.get(7)?,
            created_at: row.get::<_, Option<i64>>(8)?.unwrap_or(0), 
            updated_at: row.get::<_, Option<i64>>(9)?.unwrap_or(0),
            books,
        })
    }).map_err(|e| e.to_string())?;

    Ok(project)
}

#[tauri::command]
async fn get_project_books(app_handle: tauri::AppHandle, project_id: String) -> Result<Vec<BookRow>, String> {
    let path = get_db_path(&app_handle)?;
    let conn = Connection::open(path).map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare("SELECT id, title, order_index FROM books WHERE project_id = ?1 ORDER BY order_index ASC")
        .map_err(|e| e.to_string())?;

    let book_rows = stmt.query_map([project_id], |row| {
        Ok(BookRow {
            id: row.get(0)?,
            title: row.get(1)?,
            order_index: row.get(2)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut books = Vec::new();
    for book in book_rows {
        books.push(book.map_err(|e| e.to_string())?);
    }
    Ok(books)
}

#[tauri::command]
async fn get_book_documents(app_handle: tauri::AppHandle, book_id: String) -> Result<Vec<ManuscriptDoc>, String> {
    let path = get_db_path(&app_handle)?;
    let conn = Connection::open(path).map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            "SELECT 
                id, project_id, book_id, parent_id, title, content, 
                doc_type, version, is_archived, order_index, created_at, updated_at 
             FROM documents 
             WHERE book_id = ?1 AND is_archived = 0
             ORDER BY order_index ASC"
        )
        .map_err(|e| e.to_string())?;

    let doc_rows = stmt.query_map([book_id], |row| {
        Ok(ManuscriptDoc {
            id: row.get(0)?,
            project_id: row.get(1)?,
            book_id: row.get(2)?,
            parent_id: row.get(3)?,
            title: row.get(4)?,
            content: row.get(5)?,
            doc_type: row.get(6)?,
            version: row.get(7)?,
            is_archived: row.get(8)?,
            order_index: row.get(9)?,
            created_at: row.get(10)?,
            updated_at: row.get(11)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut docs = Vec::new();
    for doc in doc_rows {
        docs.push(doc.map_err(|e| e.to_string())?);
    }
    Ok(docs)
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

#[tauri::command]
async fn get_trashed_projects(app_handle: tauri::AppHandle) -> Result<Vec<ProjectRow>, String> {
    let path = get_db_path(&app_handle)?;
    let conn = Connection::open(path).map_err(|e| e.to_string())?;

    let mut stmt = conn.prepare(
        "SELECT 
            p.id, p.name, p.series_name, p.volume_number, p.type, p.book_count, p.genre, p.description, p.created_at, p.updated_at,
            COALESCE((SELECT json_group_array(json_object('id', b.id, 'title', b.title, 'order_index', b.order_index)) 
            FROM books b WHERE b.project_id = p.id), '[]') as books_json
        FROM projects p
        WHERE p.deleted_at IS NOT NULL
        ORDER BY p.deleted_at DESC"
    ).map_err(|e| e.to_string())?;

    let rows = stmt.query_map([], |row| {
        let books_json: String = row.get(10)?; 
        let books: Vec<BookRow> = serde_json::from_str(&books_json).map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))?;
        
        Ok(ProjectRow {
            id: row.get(0)?,
            name: row.get(1)?,
            series_name: row.get::<_, Option<String>>(2)?.unwrap_or_default(),
            volume_number: row.get::<_, Option<i32>>(3)?.unwrap_or(1),
            project_type: row.get(4)?,
            book_count: row.get(5)?,
            genre: row.get(6)?,
            description: row.get(7)?,
            created_at: row.get::<_, Option<i64>>(8)?.unwrap_or(0),
            updated_at: row.get::<_, Option<i64>>(9)?.unwrap_or(0),
            books,
        })
    }).map_err(|e| e.to_string())?;

    let mut projects = Vec::new();
    for p in rows { projects.push(p.map_err(|e| e.to_string())?); }
    Ok(projects)
}

#[tauri::command]
async fn restore_project(app_handle: tauri::AppHandle, id: String) -> Result<(), String> {
    let path = get_db_path(&app_handle)?;
    let conn = Connection::open(path).map_err(|e| e.to_string())?;

    conn.execute("UPDATE projects SET deleted_at = NULL WHERE id = ?1", [id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn purge_project(app_handle: tauri::AppHandle, id: String) -> Result<(), String> {
    let path = get_db_path(&app_handle)?;
    let conn = Connection::open(path).map_err(|e| e.to_string())?;
    
    conn.execute("DELETE FROM projects WHERE id = ?1", [id]).map_err(|e| e.to_string())?;
    
    // Clean up the file size after deletion
    conn.execute("VACUUM", []).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn empty_trash(app_handle: tauri::AppHandle) -> Result<(), String> {
    let path = get_db_path(&app_handle)?;
    let conn = Connection::open(path).map_err(|e| e.to_string())?;

    conn.execute("DELETE FROM projects WHERE deleted_at IS NOT NULL", []).map_err(|e| e.to_string())?;
    
    conn.execute("VACUUM", []).map_err(|e| e.to_string())?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let conn = init_db(app.handle())?;

            app.manage(AppState {
                db: Mutex::new(conn),
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            create_project, 
            create_book, 
            create_document,
            get_projects, 
            get_project_books, 
            get_book_documents,
            get_project_by_id,
            delete_project, 
            get_trashed_projects, 
            restore_project, 
            purge_project, 
            empty_trash
            ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}