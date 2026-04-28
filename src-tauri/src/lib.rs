use rusqlite::OptionalExtension;
use rusqlite::{params, Connection};
use std::sync::Mutex;
use tauri::Emitter;
use tauri::Manager;
use uuid::Uuid;

mod commands;
mod models;

pub struct AppState {
    pub db: Mutex<rusqlite::Connection>,
}

#[derive(serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct BookRow {
    id: String,
    title: String,
    #[serde(rename = "orderIndex")]
    order_index: i32,
}

#[derive(serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct ProjectRow {
    id: String,
    name: String,
    series_name: String,
    volume_number: i32,
    #[serde(rename = "type")]
    project_type: String,
    book_count: i32,
    genres: Vec<String>,
    pov: String,
    description: String,
    cover_path: Option<String>,
    created_at: i64,
    updated_at: i64,
    books: Vec<BookRow>,
}

#[derive(serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ManuscriptDoc {
    id: String,
    draft_id: String,
    parent_id: Option<String>, // For Scene -> Chapter nesting
    title: String,
    content: String,
    doc_type: String, // 'chapter' or 'scene'
    order_index: i32,
    created_at: i64,
    updated_at: i64,
}

fn init_db(app_handle: &tauri::AppHandle) -> Result<Connection, String> {
    let path = get_db_path(app_handle)?;
    let conn = Connection::open(path).map_err(|e| e.to_string())?;

    // Enable WAL mode for better concurrency
    let _: String = conn
        .query_row("PRAGMA journal_mode = WAL", [], |row| row.get(0))
        .map_err(|e| e.to_string())?;
    // Enable Foreign Keys (Crucial for ON DELETE CASCADE!)
    conn.execute("PRAGMA foreign_keys = ON", [])
        .map_err(|e| e.to_string())?;

    conn.execute_batch(
        "BEGIN;
            CREATE TABLE IF NOT EXISTS projects (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                project_type TEXT NOT NULL,
                series_name TEXT DEFAULT '',
                book_count INTEGER DEFAULT 1,
                volume_number INTEGER DEFAULT 1,
                genres TEXT DEFAULT '[]',
                pov TEXT DEFAULT '',
                description TEXT DEFAULT '',
                cover_path TEXT,
                created_at INTEGER,
                updated_at INTEGER,
                deleted_at INTEGER
            );

            CREATE TABLE IF NOT EXISTS books (
                id TEXT PRIMARY KEY,
                project_id TEXT NOT NULL,
                title TEXT NOT NULL,
                description TEXT DEFAULT '',
                order_index INTEGER NOT NULL,
                status TEXT DEFAULT 'Planning',
                target_word_count INTEGER DEFAULT 50000,
                FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS drafts (
                id TEXT PRIMARY KEY,
                book_id TEXT NOT NULL,
                name TEXT NOT NULL,
                version_number INTEGER NOT NULL,
                is_complete BOOLEAN DEFAULT 0,
                is_locked BOOLEAN DEFAULT 0,
                created_at INTEGER NOT NULL,
                FOREIGN KEY(book_id) REFERENCES books(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS documents (
                id TEXT PRIMARY KEY,
                draft_id TEXT NOT NULL, 
                parent_id TEXT,
                title TEXT NOT NULL,
                content TEXT DEFAULT '',
                doc_type TEXT NOT NULL,
                order_index INTEGER NOT NULL,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                deleted_at INTEGER,
                FOREIGN KEY(draft_id) REFERENCES drafts(id) ON DELETE CASCADE,
                FOREIGN KEY(parent_id) REFERENCES documents(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS user_preferences (
                id TEXT PRIMARY KEY,
                project_id TEXT NOT NULL,
                pref_key TEXT NOT NULL,
                pref_value TEXT NOT NULL,
                FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS characters (
            id TEXT PRIMARY KEY,
            project_id TEXT NOT NULL,
            book_id TEXT, -- Nullable: links to specific book if not global
            display_name TEXT NOT NULL,
            role TEXT DEFAULT 'Supporting',
            portrait_path TEXT,
            is_global BOOLEAN DEFAULT 1,
            metadata TEXT NOT NULL,
            last_modified INTEGER NOT NULL,
            book_overrides TEXT,
            FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE,
            FOREIGN KEY(book_id) REFERENCES books(id) ON DELETE SET NULL
        );

            CREATE UNIQUE INDEX IF NOT EXISTS idx_pref_project_key ON user_preferences(project_id, pref_key);

            PRAGMA user_version = 10; 
        COMMIT;"
    ).map_err(|e| e.to_string())?;

    Ok(conn)
}

fn get_db_path(app_handle: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    let mut path = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;
    path.push("storyforge.db");
    Ok(path)
}

#[tauri::command(rename_all = "snake_case")]
async fn create_project(
    state: tauri::State<'_, AppState>,
    id: String,
    name: String,
    series_name: String,
    project_type: String,
    genres: Vec<String>,
    pov: String,
    description: String,
    books_to_create: Vec<(String, String)>, // Array of [ID, Title]
) -> Result<(), String> {
    let mut conn = state.db.lock().unwrap();
    let now = chrono::Utc::now().timestamp();
    let genres_json = serde_json::to_string(&genres).unwrap_or_else(|_| "[]".to_string());

    let tx = conn.transaction().map_err(|e| e.to_string())?;

    // 1. Insert Project
    tx.execute(
        "INSERT INTO projects (id, name, project_type, series_name, book_count, volume_number, genres, pov, description, cover_path, created_at, updated_at) 
         VALUES (?1, ?2, ?3, ?4, ?5, 1, ?6, ?7, ?8, ?9, ?10, ?10)",
        (&id, &name, &project_type, &series_name, &(books_to_create.len() as i32), &genres_json, &pov, &description, Option::<String>::None, &now),
    ).map_err(|e| e.to_string())?;

    // 2. Insert Books + Drafts + Chapters + Initial Scenes
    for (i, (book_id, book_title)) in books_to_create.iter().enumerate() {
        let draft_id = Uuid::new_v4().to_string();
        let chapter_id = Uuid::new_v4().to_string();
        let scene_id = Uuid::new_v4().to_string();

        // Insert Book record
        tx.execute(
            "INSERT INTO books (id, project_id, title, order_index) VALUES (?1, ?2, ?3, ?4)",
            (book_id, &id, book_title, &(i as i32)),
        )
        .map_err(|e| e.to_string())?;

        // Insert the "First Draft" container
        tx.execute(
            "INSERT INTO drafts (id, book_id, name, version_number, created_at) VALUES (?1, ?2, 'First Draft', 1, ?3)",
            (&draft_id, book_id, &now),
        ).map_err(|e| e.to_string())?;

        // Insert the initial Chapter document
        tx.execute(
            "INSERT INTO documents (id, draft_id, title, doc_type, order_index, created_at, updated_at) 
             VALUES (?1, ?2, 'Chapter 1', 'chapter', 0, ?3, ?3)",
            (&chapter_id, &draft_id, &now),
        ).map_err(|e| e.to_string())?;

        // Insert the initial Scene document nested under the Chapter
        tx.execute(
            "INSERT INTO documents (id, draft_id, parent_id, title, content, doc_type, order_index, created_at, updated_at) 
             VALUES (?1, ?2, ?3, 'Scene 1', '', 'scene', 0, ?4, ?4)",
            (&scene_id, &draft_id, &chapter_id, &now),
        ).map_err(|e| e.to_string())?;
    }

    tx.commit().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn create_initial_draft(
    state: tauri::State<'_, AppState>,
    book_id: String,
) -> Result<String, String> {
    let conn = state.db.lock().unwrap();
    let draft_id = Uuid::new_v4().to_string();
    
    conn.execute(
        "INSERT INTO drafts (id, book_id, name, version_number, is_locked) 
         VALUES (?1, ?2, 'First Draft', 1, 0)",
        params![draft_id, book_id],
    ).map_err(|e| e.to_string())?;

    Ok(draft_id)
}

#[tauri::command(rename_all = "snake_case")]
async fn create_book(
    state: tauri::State<'_, AppState>,
    id: String,
    project_id: String,
    title: String,
    order_index: i32,
) -> Result<(), String> {
    let mut conn = state.db.lock().unwrap();
    let now = chrono::Utc::now().timestamp();
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    // 1. Create Book
    tx.execute(
        "INSERT INTO books (id, project_id, title, order_index) VALUES (?1, ?2, ?3, ?4)",
        (&id, &project_id, &title, &order_index),
    )
    .map_err(|e| e.to_string())?;

    // 2. Create Initial Draft
    let draft_id = Uuid::new_v4().to_string();
    tx.execute(
        "INSERT INTO drafts (id, book_id, name, version_number, created_at) VALUES (?1, ?2, 'First Draft', 1, ?3)",
        (&draft_id, &id, &now),
    ).map_err(|e| e.to_string())?;

    // 3. Create First Chapter
    let chapter_id = Uuid::new_v4().to_string();
    tx.execute(
        "INSERT INTO documents (id, draft_id, parent_id, title, content, doc_type, order_index, created_at, updated_at) 
         VALUES (?1, ?2, NULL, 'Chapter 1', '', 'chapter', 0, ?3, ?3)",
        (&chapter_id, &draft_id, &now),
    ).map_err(|e| e.to_string())?;

    // 4. Create First Scene
    let scene_id = Uuid::new_v4().to_string();
    tx.execute(
        "INSERT INTO documents (id, draft_id, parent_id, title, content, doc_type, order_index, created_at, updated_at) 
        VALUES (?1, ?2, ?3, 'Untitled Scene', '', 'scene', 0, ?4, ?4)",
        (&scene_id, &draft_id, &chapter_id, &now),
    ).map_err(|e| e.to_string())?;

    tx.commit().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command(rename_all = "snake_case")]
async fn create_document(
    state: tauri::State<'_, AppState>,
    book_id: String,
    parent_id: Option<String>,
    doc_type: String,
) -> Result<ManuscriptDoc, String> {
    let conn = state.db.lock().unwrap();
    let id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().timestamp();

    // 1. Find the active draft for this book
    let draft_id: String = conn
        .query_row(
            "SELECT id FROM drafts WHERE book_id = ?1 ORDER BY version_number ASC LIMIT 1",
            [&book_id],
            |row| row.get(0),
        )
        .map_err(|e| format!("Draft search failed: {}", e))?;

    // 2. Determine the Title: count existing non-deleted chapters in THIS draft
    let title = if doc_type == "chapter" {
        let count: i32 = conn.query_row(
            "SELECT COUNT(*) FROM documents WHERE draft_id = ?1 AND doc_type = 'chapter' AND deleted_at IS NULL",
            [&draft_id],
            |row| row.get(0)
        ).map_err(|e| e.to_string())?;
        format!("Chapter {}", count + 1)
    } else {
        "New Scene".into()
    };

    // 3. Calculate next order_index within the specific parent/draft scope
    let next_index: i32 = conn
        .query_row(
            "SELECT COALESCE(MAX(order_index), -1) + 1 
             FROM documents 
             WHERE draft_id = ?1 AND parent_id IS ?2 AND deleted_at IS NULL",
            rusqlite::params![&draft_id, &parent_id],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    let doc = ManuscriptDoc {
        id: id.clone(),
        draft_id: draft_id.clone(),
        parent_id: parent_id.clone(),
        title: title.clone(),
        content: "".into(),
        doc_type: doc_type.clone(),
        order_index: next_index,
        created_at: now,
        updated_at: now,
    };

    // 4. Insert into the new schema
    conn.execute(
        "INSERT INTO documents (
            id, draft_id, parent_id, title, content, 
            doc_type, order_index, created_at, updated_at
        )
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
        rusqlite::params![
            &doc.id,
            &doc.draft_id,
            &doc.parent_id,
            &doc.title,
            &doc.content,
            &doc.doc_type,
            &doc.order_index,
            &doc.created_at,
            &doc.updated_at
        ],
    )
    .map_err(|e| e.to_string())?;

    Ok(doc)
}

#[tauri::command]
async fn get_projects(state: tauri::State<'_, AppState>) -> Result<Vec<ProjectRow>, String> {
    let conn = state.db.lock().unwrap();

    let mut stmt = conn
        .prepare(
            "SELECT 
            p.id, 
            p.name, 
            p.series_name, 
            p.volume_number, 
            p.project_type AS type,
            (SELECT COUNT(*) FROM books WHERE project_id = p.id) as actual_book_count, 
            p.genres, 
            p.pov, 
            p.description,
            p.cover_path,
            p.created_at, 
            p.updated_at,
            COALESCE(
                (SELECT json_group_array(
                    json_object(
                        'id', b.id, 
                        'title', b.title, 
                        'orderIndex', b.order_index
                    )
                ) FROM books b WHERE b.project_id = p.id),
                '[]'
            ) as books_json
        FROM projects p
        WHERE p.deleted_at IS NULL
        ORDER BY p.updated_at DESC",
        )
        .map_err(|e| e.to_string())?;

    let project_rows = stmt
        .query_map([], |row| {
            // Handle Genres JSON
            let genres_raw: String = row
                .get::<_, Option<String>>("genres")?
                .unwrap_or_else(|| "[]".to_string());
            let parsed_genres: Vec<String> =
                serde_json::from_str(&genres_raw).unwrap_or_else(|_| vec![]);

            // Handle Books JSON
            let books_json: String = row
                .get::<_, Option<String>>("books_json")?
                .unwrap_or_else(|| "[]".to_string());
            let parsed_books: Vec<BookRow> =
                serde_json::from_str(&books_json).unwrap_or_else(|_| vec![]);

            Ok(ProjectRow {
                id: row.get("id")?,
                name: row.get("name")?,
                series_name: row
                    .get::<_, Option<String>>("series_name")?
                    .unwrap_or_default(),
                volume_number: row.get::<_, Option<i32>>("volume_number")?.unwrap_or(1),
                project_type: row.get("type")?,
                book_count: row.get("actual_book_count")?,
                genres: parsed_genres,
                pov: row.get::<_, Option<String>>("pov")?.unwrap_or_default(),
                description: row
                    .get::<_, Option<String>>("description")?
                    .unwrap_or_default(),
                cover_path: row.get::<_, Option<String>>("cover_path")?,
                created_at: row.get::<_, Option<i64>>("created_at")?.unwrap_or(0),
                updated_at: row.get::<_, Option<i64>>("updated_at")?.unwrap_or(0),
                books: parsed_books,
            })
        })
        .map_err(|e| e.to_string())?;

    project_rows
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_project_by_id(
    state: tauri::State<'_, AppState>,
    id: String,
) -> Result<ProjectRow, String> {
    let conn = state.db.lock().unwrap();

    let mut stmt = conn
        .prepare(
            "SELECT 
            p.id, 
            p.name, 
            p.series_name, 
            p.volume_number, 
            p.project_type AS type,
            p.book_count, 
            p.genres, 
            p.pov, 
            p.description, 
            p.cover_path,
            p.created_at, 
            p.updated_at, 
            COALESCE(
                (SELECT json_group_array(
                    json_object('id', b.id, 'title', b.title, 'orderIndex', b.order_index)
                ) FROM books b WHERE b.project_id = p.id),
                '[]'
            ) as books_json 
        FROM projects p
        WHERE p.id = ?1",
        )
        .map_err(|e| e.to_string())?;

    let project = stmt
        .query_row([id], |row| {
            let genres_raw: String = row.get::<_, Option<String>>("genres")?.unwrap_or_else(|| "[]".to_string());
            let books_raw: String = row.get::<_, Option<String>>("books_json")?.unwrap_or_else(|| "[]".to_string());

            Ok(ProjectRow {
                id: row.get("id")?,
                name: row.get("name")?,
                series_name: row
                    .get::<_, Option<String>>("series_name")?
                    .unwrap_or_default(),
                volume_number: row.get::<_, Option<i32>>("volume_number")?.unwrap_or(1),
                project_type: row.get("type")?,
                book_count: row.get("book_count")?,
                genres: serde_json::from_str(&genres_raw).unwrap_or_else(|_| vec![]),
                pov: row.get::<_, Option<String>>("pov")?.unwrap_or_default(),
                description: row
                    .get::<_, Option<String>>("description")?
                    .unwrap_or_default(),
                    cover_path: row.get::<_, Option<String>>("cover_path")?,
                created_at: row.get::<_, Option<i64>>("created_at")?.unwrap_or(0),
                updated_at: row.get::<_, Option<i64>>("updated_at")?.unwrap_or(0),
                books: serde_json::from_str(&books_raw).unwrap_or_else(|_| vec![]),
            })
        })
        .map_err(|e| e.to_string())?;

    Ok(project)
}

#[tauri::command]
async fn get_project_books(
    state: tauri::State<'_, AppState>,
    project_id: String,
) -> Result<Vec<BookRow>, String> {
    let conn = state.db.lock().unwrap();

    let mut stmt = conn
        .prepare("SELECT id, title, order_index FROM books WHERE project_id = ?1 ORDER BY order_index ASC")
        .map_err(|e| e.to_string())?;

    let book_rows = stmt
        .query_map([project_id], |row| {
            Ok(BookRow {
                id: row.get(0)?,
                title: row.get(1)?,
                order_index: row.get(2)?,
            })
        })
        .map_err(|e| e.to_string())?;

    // Collect results into a Vec, automatically handling potential errors
    book_rows
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_book_documents(
    state: tauri::State<'_, AppState>,
    book_id: String,
) -> Result<Vec<ManuscriptDoc>, String> {
    let conn = state.db.lock().unwrap();

    // 1. Find the ID of the 'First Draft' - using .optional() to handle race conditions
    let draft_id: Option<String> = conn
        .query_row(
            "SELECT id FROM drafts WHERE book_id = ?1 ORDER BY version_number ASC LIMIT 1",
            [&book_id],
            |row| row.get(0),
        )
        .optional()
        .map_err(|e| e.to_string())?;

    // 2. If no draft exists yet, return an empty vector immediately
    let draft_id = match draft_id {
        Some(id) => id,
        None => return Ok(vec![]),
    };

    // 3. Fetch chapters and scenes
    let mut stmt = conn
        .prepare(
            "SELECT 
                id, draft_id, parent_id, title, content, 
                doc_type, order_index, created_at, updated_at 
             FROM documents 
             WHERE draft_id = ?1 AND deleted_at IS NULL
             ORDER BY order_index ASC",
        )
        .map_err(|e| e.to_string())?;

    let doc_rows = stmt
        .query_map([&draft_id], |row| {
            Ok(ManuscriptDoc {
                id: row.get(0)?,
                draft_id: row.get(1)?,
                parent_id: row.get(2)?,
                title: row.get(3)?,
                content: row.get(4)?,
                doc_type: row.get(5)?,
                order_index: row.get(6)?,
                created_at: row.get(7)?,
                updated_at: row.get(8)?,
            })
        })
        .map_err(|e| e.to_string())?;

    doc_rows
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())
}

#[tauri::command(rename_all = "snake_case")]
async fn update_project(
    app_handle: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    id: String,
    name: String,
    series_name: String,
    volume_number: i32,
    description: String,
    cover_path: Option<String>,
    genres: Vec<String>,
    project_type: String,
    pov: String,
) -> Result<(), String> {
    println!("Updating project {} with cover_path: {:?}", id, cover_path);
    let conn = state.db.lock().unwrap();

    // --- 1. CLEANUP LOGIC: Get the old path before updating ---
    let old_path: Option<String> = conn
        .query_row(
            "SELECT cover_path FROM projects WHERE id = ?1",
            [&id],
            |row| row.get(0),
        )
        .optional()
        .map_err(|e| e.to_string())?
        .flatten();

    // If the path has changed, delete the old file
    if let Some(old) = old_path {
        if Some(&old) != cover_path.as_ref() {
            // We ignore errors here so the DB update still happens even if file deletion fails
            let _ = commands::media::internal_delete_asset_file(&app_handle, &old);
        }
    }

    // --- 2. EXISTING DB UPDATE ---
    let genres_json = serde_json::to_string(&genres).unwrap_or_else(|_| "[]".to_string());

    conn.execute(
        "UPDATE projects SET 
         name = ?1, 
         series_name = ?2, 
         volume_number = ?3, 
         description = ?4, 
         genres = ?5, 
         project_type = ?6, 
         pov = ?7, 
         cover_path = ?8, -- 2. Add the column here
         updated_at = strftime('%s', 'now')
         WHERE id = ?9",
        (
            &name,
            &series_name,
            &volume_number,
            &description,
            &genres_json,
            &project_type,
            &pov,
            &cover_path,
            &id,
        ),
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command(rename_all = "snake_case")]
async fn update_project_cover(
    state: tauri::State<'_, AppState>,
    id: String,
    cover_path: Option<String>,
) -> Result<(), String> {
    let conn = state.db.lock().unwrap();
    let now = chrono::Utc::now().timestamp();

    conn.execute(
        "UPDATE projects SET cover_path = ?1, updated_at = ?2 WHERE id = ?3",
        (&cover_path, &now, &id),
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
async fn update_book_title(
    state: tauri::State<'_, AppState>,
    id: String,
    title: String,
) -> Result<(), String> {
    let conn = state.db.lock().unwrap();
    conn.execute("UPDATE books SET title = ?1 WHERE id = ?2", (title, id))
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command(rename_all = "snake_case")]
async fn update_document_content(
    state: tauri::State<'_, AppState>,
    id: String,
    content: String,
) -> Result<(), String> {
    let conn = state.db.lock().unwrap();
    let now = chrono::Utc::now().timestamp();

    conn.execute(
        "UPDATE documents SET content = ?1, updated_at = ?2 WHERE id = ?3",
        params![content, now, id],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command(rename_all = "snake_case")]
async fn delete_project(state: tauri::State<'_, AppState>, id: String) -> Result<(), String> {
    let conn = state.db.lock().unwrap();
    let now = chrono::Utc::now().timestamp();

    conn.execute(
        "UPDATE projects SET deleted_at = ?1 WHERE id = ?2",
        params![now, id],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command(rename_all = "snake_case")]
async fn delete_book(
    state: tauri::State<'_, AppState>,
    id: String,
    project_id: String,
) -> Result<(), String> {
    let mut conn = state.db.lock().unwrap();
    let now = chrono::Utc::now().timestamp();

    let tx = conn.transaction().map_err(|e| e.to_string())?;

    // 1. Cascade Delete
    tx.execute(
        "DELETE FROM documents WHERE draft_id IN (SELECT id FROM drafts WHERE book_id = ?1)",
        [&id],
    )
    .map_err(|e| e.to_string())?;

    tx.execute("DELETE FROM drafts WHERE book_id = ?1", [&id])
        .map_err(|e| e.to_string())?;
    tx.execute("DELETE FROM books WHERE id = ?1", [&id])
        .map_err(|e| e.to_string())?;

    // 2. RE-SEQUENCE BLOCK
    // Wrapped in a block so 'stmt' is dropped before tx.commit()
    let remaining_count = {
        let mut stmt = tx
            .prepare("SELECT id FROM books WHERE project_id = ?1 ORDER BY order_index ASC")
            .map_err(|e| e.to_string())?;

        let book_ids: Vec<String> = stmt
            .query_map([&project_id], |row| row.get(0))
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?;

        for (i, b_id) in book_ids.iter().enumerate() {
            tx.execute(
                "UPDATE books SET order_index = ?1 WHERE id = ?2",
                params![i as i32, b_id],
            )
            .map_err(|e| e.to_string())?;
        }
        book_ids.len() as i32
    };

    // 3. Update Project Metadata
    if remaining_count <= 1 {
        tx.execute(
            "UPDATE projects SET 
                project_type = 'standalone', 
                series_name = '', 
                book_count = 1,
                updated_at = ?1 
             WHERE id = ?2",
            params![now, &project_id],
        )
        .map_err(|e| e.to_string())?;
    } else {
        tx.execute(
            "UPDATE projects SET 
                book_count = ?1, 
                updated_at = ?2 
             WHERE id = ?3",
            params![remaining_count, now, &project_id],
        )
        .map_err(|e| e.to_string())?;
    }

    // Now tx is free to be moved into commit()
    tx.commit().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command(rename_all = "snake_case")]
async fn delete_document(
    state: tauri::State<'_, AppState>,
    id: String,
    _book_id: String,
) -> Result<(), String> {
    let mut conn = state.db.lock().unwrap();
    let now = chrono::Utc::now().timestamp();

    // 1. Get the draft_id and parent_id first
    let (draft_id, parent_id): (String, Option<String>) = conn
        .query_row(
            "SELECT draft_id, parent_id FROM documents WHERE id = ?1",
            params![id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .map_err(|e| format!("Could not find document context: {}", e))?;

    // 2. Start a Transaction
    // Everything from here to the commit is treated as a single atomic unit.
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    // 3. Soft delete inside the transaction
    tx.execute(
        "UPDATE documents SET deleted_at = ?1 WHERE id = ?2",
        params![now, id],
    )
    .map_err(|e| e.to_string())?;

    // 4. Fetch siblings
    let chapters: Vec<(String, String)> = {
        let mut stmt = tx
            .prepare(
                "SELECT id, title FROM documents 
             WHERE draft_id = ?1 
             AND (parent_id IS ?2)
             AND doc_type = 'chapter' 
             AND deleted_at IS NULL 
             ORDER BY order_index ASC",
            )
            .map_err(|e| e.to_string())?;

        let query_params = params![draft_id, parent_id];

        let mapped_rows = stmt
            .query_map(query_params, |row| {
                Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
            })
            .map_err(|e| e.to_string())?;

        let mut results = Vec::new();
        for row in mapped_rows {
            results.push(row.map_err(|e| e.to_string())?);
        }
        results // Return the vector
    }; // stmt and query_params are dropped here

    // 5. Re-sequence loop
    for (i, (chap_id, current_title)) in chapters.iter().enumerate() {
        let new_pos = i as i32;
        let expected_number = new_pos + 1;
        let default_pattern = "Chapter ";

        // Check: Does the title start with "Chapter "?
        // If so, assume it's an auto-generated name and update it.
        if current_title.starts_with(default_pattern) {
            let new_title = format!("Chapter {}", expected_number);
            tx.execute(
                "UPDATE documents SET title = ?1, order_index = ?2 WHERE id = ?3",
                params![new_title, new_pos, chap_id],
            )
            .map_err(|e| e.to_string())?;
        } else {
            // It's a custom name - keep the title, just update the position.
            tx.execute(
                "UPDATE documents SET order_index = ?1 WHERE id = ?2",
                params![new_pos, chap_id],
            )
            .map_err(|e| e.to_string())?;
        }
    }

    // 6. Commit all changes
    tx.commit().map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
async fn get_trashed_projects(
    state: tauri::State<'_, AppState>,
) -> Result<Vec<ProjectRow>, String> {
    let conn = state.db.lock().unwrap();

    let mut stmt = conn
        .prepare(
            "SELECT 
            p.id, 
            p.name, 
            p.series_name, 
            p.volume_number, 
            p.project_type AS type,
            p.book_count, 
            p.genres, 
            p.pov, 
            p.description, 
            p.cover_path,
            p.created_at, 
            p.updated_at, 
            COALESCE(
                (SELECT json_group_array(
                    json_object('id', b.id, 'title', b.title, 'orderIndex', b.order_index)
                ) FROM books b WHERE b.project_id = p.id),
                '[]'
            ) as books_json 
        FROM projects p
        WHERE p.deleted_at IS NOT NULL
        ORDER BY p.deleted_at DESC",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            // Fetch raw JSON strings with defaults
            let genres_raw: String = row
                .get::<&str, Option<String>>("genres")?
                .unwrap_or_else(|| "[]".to_string());
            let books_raw: String = row
                .get::<&str, String>("books_json")
                .unwrap_or_else(|_| "[]".to_string());

            Ok(ProjectRow {
                id: row.get("id")?,
                name: row.get("name")?,
                series_name: row
                    .get::<&str, Option<String>>("series_name")?
                    .unwrap_or_default(),
                volume_number: row.get::<&str, Option<i32>>("volume_number")?.unwrap_or(1),
                project_type: row.get("type")?,
                book_count: row.get("book_count")?,
                genres: serde_json::from_str(&genres_raw).unwrap_or_else(|_| vec![]),
                pov: row.get::<&str, Option<String>>("pov")?.unwrap_or_default(),
                description: row
                    .get::<&str, Option<String>>("description")?
                    .unwrap_or_default(),
                cover_path: row.get::<_, Option<String>>("cover_path")?,
                created_at: row.get::<&str, Option<i64>>("created_at")?.unwrap_or(0),
                updated_at: row.get::<&str, Option<i64>>("updated_at")?.unwrap_or(0),
                books: serde_json::from_str(&books_raw).unwrap_or_else(|_| vec![]),
            })
        })
        .map_err(|e| e.to_string())?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn restore_project(state: tauri::State<'_, AppState>, id: String) -> Result<(), String> {
    let conn = state.db.lock().unwrap();

    conn.execute("UPDATE projects SET deleted_at = NULL WHERE id = ?1", [id])
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
async fn purge_project(state: tauri::State<'_, AppState>, id: String) -> Result<(), String> {
    let conn = state.db.lock().unwrap();

    // Delete the project (Foreign keys will handle books/docs if ON DELETE CASCADE is set)
    conn.execute("DELETE FROM projects WHERE id = ?1", [id])
        .map_err(|e| e.to_string())?;

    // VACUUM cleans up unused space and shrinks the database file
    conn.execute("VACUUM", []).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
async fn empty_trash(state: tauri::State<'_, AppState>) -> Result<(), String> {
    let conn = state.db.lock().unwrap();

    // Wipe all projects marked for deletion
    conn.execute("DELETE FROM projects WHERE deleted_at IS NOT NULL", [])
        .map_err(|e| e.to_string())?;

    // Reclaim disk space
    conn.execute("VACUUM", []).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command(rename_all = "snake_case")]
async fn set_expanded_chapters(
    state: tauri::State<'_, AppState>,
    project_id: String,
    ids: Vec<String>,
) -> Result<(), String> {
    let conn = state.db.lock().unwrap();
    let json_ids = serde_json::to_string(&ids).map_err(|e| e.to_string())?;

    conn.execute(
        "INSERT OR REPLACE INTO user_preferences (id, project_id, pref_key, pref_value) 
         VALUES (?1, ?2, 'expanded_chapters', ?3)",
        params![format!("{}_exp", project_id), project_id, json_ids],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command(rename_all = "snake_case")]
async fn get_expanded_chapters(
    app_handle: tauri::AppHandle,
    project_id: String,
) -> Result<Vec<String>, String> {
    let path = get_db_path(&app_handle)?;
    let conn = Connection::open(path).map_err(|e| e.to_string())?;

    let res: Result<String, _> = conn.query_row(
        "SELECT pref_value FROM user_preferences WHERE project_id = ?1 AND pref_key = 'expanded_chapters'",
        [project_id],
        |row| row.get(0),
    );

    match res {
        Ok(json) => serde_json::from_str(&json).map_err(|e| e.to_string()),
        Err(_) => Ok(vec![]), // Return empty if not set yet
    }
}

#[tauri::command(rename_all = "snake_case")]
async fn set_last_active_book(
    app_handle: tauri::AppHandle,
    project_id: String,
    book_id: String,
) -> Result<(), String> {
    let path = get_db_path(&app_handle)?;
    let conn = Connection::open(path).map_err(|e| e.to_string())?;

    conn.execute(
        "INSERT OR REPLACE INTO user_preferences (id, project_id, pref_key, pref_value) 
         VALUES (?1, ?2, 'last_active_book', ?3)",
        params![format!("{}_book", project_id), project_id, book_id],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command(rename_all = "snake_case")]
async fn get_last_active_book(
    app_handle: tauri::AppHandle,
    project_id: String,
) -> Result<Option<String>, String> {
    let path = get_db_path(&app_handle)?;
    let conn = Connection::open(path).map_err(|e| e.to_string())?;

    // Use .optional() to turn a "No Rows" error into a successful "None"
    let res: Option<String> = conn.query_row(
        "SELECT pref_value FROM user_preferences WHERE project_id = ?1 AND pref_key = 'last_active_book'",
        [project_id],
        |row| row.get(0),
    ).optional().map_err(|e| e.to_string())?;

    Ok(res)
}

#[tauri::command(rename_all = "snake_case")]
async fn set_user_preference(
    state: tauri::State<'_, AppState>,
    project_id: String,
    key: String,
    value: String,
) -> Result<(), String> {
    let conn = state.db.lock().unwrap();

    // Generate a unique ID for the row based on project + key
    let pref_id = format!("{}_{}", project_id, key);

    conn.execute(
        "INSERT OR REPLACE INTO user_preferences (id, project_id, pref_key, pref_value) 
         VALUES (?1, ?2, ?3, ?4)",
        params![pref_id, project_id, key, value],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command(rename_all = "snake_case")]
async fn get_user_preference(
    state: tauri::State<'_, AppState>,
    project_id: String,
    key: String,
) -> Result<Option<String>, String> {
    let conn = state.db.lock().unwrap();

    let res: Option<String> = conn
        .query_row(
            "SELECT pref_value FROM user_preferences WHERE project_id = ?1 AND pref_key = ?2",
            rusqlite::params![project_id, key],
            |row| row.get(0),
        )
        .optional()
        .map_err(|e| e.to_string())?;

    Ok(res)
}

#[tauri::command(rename_all = "snake_case")]
async fn rename_document(
    state: tauri::State<'_, AppState>,
    id: String,
    new_title: String,
) -> Result<(), String> {
    let conn = state.db.lock().unwrap();
    let now = chrono::Utc::now().timestamp();

    conn.execute(
        "UPDATE documents SET title = ?1, updated_at = ?2 WHERE id = ?3",
        params![new_title, now, id],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            let conn = init_db(app.handle())?;

            app.manage(AppState {
                db: Mutex::new(conn),
            });

            if let Some(window) = app.get_webview_window("main") {
                // Get the monitor the window is on or default to the primary monitor
                if let Ok(Some(monitor)) = window.primary_monitor() {
                    let size = monitor.size();

                    // Calculate a comfortable "native" feel: 70% width, 80% height
                    let mut width = size.width as f64 * 0.7;
                    let mut height = size.height as f64 * 0.8;

                    // Safety Clamping: Ensure the UI doesn't break on low-res displays
                    if width < 1000.0 {
                        width = 1000.0;
                    }
                    if height < 700.0 {
                        height = 700.0;
                    }

                    let _ = window.set_size(tauri::LogicalSize::new(width, height));
                    let _ = window.center();
                }
            }

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                // We emit an event to the frontend to say "Hey, we are closing!"
                let _ = window.emit("tauri://close-requested", ());
                // We prevent the window from closing immediately
                api.prevent_close();
            }
        })
        .invoke_handler(tauri::generate_handler![
            create_project,
            create_initial_draft,
            create_book,
            create_document,
            get_projects,
            get_project_books,
            get_book_documents,
            get_project_by_id,
            update_project,
            update_project_cover,
            update_document_content,
            update_book_title,
            delete_project,
            delete_book,
            delete_document,
            get_trashed_projects,
            restore_project,
            purge_project,
            empty_trash,
            set_expanded_chapters,
            get_expanded_chapters,
            set_last_active_book,
            get_last_active_book,
            set_user_preference,
            get_user_preference,
            rename_document,
            commands::character_commands::create_character,
            commands::character_commands::get_characters,
            commands::character_commands::get_character,
            commands::character_commands::update_character,
            commands::character_commands::update_character_portrait,
            commands::character_commands::delete_image_file,
            commands::character_commands::delete_character,
            commands::character_commands::globalize_project_characters,
            commands::media::upload_and_optimize_image,
            commands::media::delete_asset_file,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
