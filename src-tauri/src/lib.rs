use rusqlite::{Connection, params};
use tauri::Manager;
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

    let _ = conn.execute("ALTER TABLE projects ADD COLUMN genres TEXT DEFAULT '[]'", ());
    let _ = conn.execute("ALTER TABLE projects ADD COLUMN pov TEXT DEFAULT ''", ());
    let _ = conn.execute("ALTER TABLE projects ADD COLUMN series_name TEXT DEFAULT ''", ());
    let _ = conn.execute("ALTER TABLE projects ADD COLUMN volume_number INTEGER DEFAULT 1", ());

    let _ : String = conn.query_row("PRAGMA journal_mode = WAL", [], |row| row.get(0)).map_err(|e| e.to_string())?;

    let _ = conn.execute("ALTER TABLE projects ADD COLUMN project_type TEXT DEFAULT 'standalone'", ());
    let _ = conn.execute("ALTER TABLE projects ADD COLUMN genres TEXT DEFAULT '[]'", ());

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

    // Migration: Version 6 -> 7 (Add deleted_at to documents)
    if current_version < 7 {
        conn.execute_batch(
            "BEGIN;
                ALTER TABLE documents ADD COLUMN deleted_at INTEGER;
                PRAGMA user_version = 7;
            COMMIT;"
        ).map_err(|e| e.to_string())?;
    }

    // Migration: Version 7 -> 8 (User Preferences Table)
    if current_version < 8 {
        conn.execute_batch(
            "BEGIN;
                CREATE TABLE IF NOT EXISTS user_preferences (
                    id TEXT PRIMARY KEY,
                    project_id TEXT NOT NULL,
                    pref_key TEXT NOT NULL,
                    pref_value TEXT NOT NULL,
                    FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
                );
                CREATE UNIQUE INDEX idx_pref_project_key ON user_preferences(project_id, pref_key);
                PRAGMA user_version = 8;
            COMMIT;"
        ).map_err(|e| e.to_string())?;
    }

    if current_version < 9 {
        conn.execute_batch(
            "BEGIN;
                ALTER TABLE projects ADD COLUMN genres TEXT DEFAULT '[]';
                ALTER TABLE projects ADD COLUMN pov TEXT DEFAULT '';
                PRAGMA user_version = 9;
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
    state: tauri::State<'_, AppState>,
    id: String, 
    name: String, 
    series_name: String,
    volume_number: i32,
    project_type: String, 
    book_count: i32,
    genres: Vec<String>,
    pov: String,
    description: String,
) -> Result<(), String> {
    let conn = state.db.lock().unwrap();
    let now = chrono::Utc::now().timestamp();

    // Convert the array to a JSON string for the source-of-truth column
    let genres_json = serde_json::to_string(&genres).unwrap_or_else(|_| "[]".to_string());
    
    // Derive the legacy single-string column from the first selection
    // Using an empty string as fallback to stay consistent with our update/fetch logic
    let primary_genre = genres.first().cloned().unwrap_or_default();

    conn.execute(
        "INSERT INTO projects (
            id, name, series_name, volume_number, type, 
            book_count, created_at, updated_at, genre, genres, pov, description
        ) 
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
        (
            id, 
            name, 
            series_name, 
            volume_number, 
            project_type, 
            book_count, 
            now, 
            now, 
            primary_genre, 
            genres_json, 
            pov, 
            description
        ),
    ).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
async fn create_book(
    state: tauri::State<'_, AppState>,
    id: String,
    project_id: String,
    title: String,
    order_index: i32,
) -> Result<(), String> {
    let conn = state.db.lock().unwrap();

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

    // Determine the Title: If chapter, count existing non-deleted chapters
    let title = if doc_type == "chapter" {
        let count: i32 = conn.query_row(
            "SELECT COUNT(*) FROM documents WHERE book_id = ?1 AND doc_type = 'chapter' AND deleted_at IS NULL",
            params![book_id],
            |row| row.get(0)
        ).map_err(|e| e.to_string())?;
        format!("Chapter {}", count + 1)
    } else {
        "New Scene".into()
    };

    // Calculate the next order_index
    // find the current max index for the same parent and book
    let next_index: i32 = conn
        .query_row(
            "SELECT COALESCE(MAX(order_index), -1) + 1 
            FROM documents 
            WHERE book_id = ?1 AND parent_id IS ?2 AND deleted_at IS NULL",
            params![book_id, parent_id],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    let doc = ManuscriptDoc {
        id: id.clone(),
        project_id,
        book_id: Some(book_id),
        parent_id,
        title,
        content: "".into(),
        doc_type,
        version: 1,
        is_archived: false,
        order_index: next_index,
        created_at: now,
        updated_at: now,
    };

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
async fn get_projects(state: tauri::State<'_, AppState>) -> Result<Vec<ProjectRow>, String> {
    let conn = state.db.lock().unwrap();

    let mut stmt = conn.prepare(
        "SELECT 
            p.id, 
            p.name, 
            p.series_name, 
            p.volume_number, 
            p.type,
            (SELECT COUNT(*) FROM books WHERE project_id = p.id) as actual_book_count, 
            p.genres, 
            p.pov, 
            p.description,
            p.created_at, 
            p.updated_at,
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
        // Handle Genres: fetch raw string, default to empty array JSON if null
        let genres_raw: String = row.get::<&str, Option<String>>("genres")?
            .unwrap_or_else(|| "[]".to_string());

        // Parse genres JSON string into Vec<String>
        let parsed_genres: Vec<String> = serde_json::from_str(&genres_raw).unwrap_or_else(|_| {
            // Fallback: If it's not valid JSON but has text, wrap that text in a vec
            if !genres_raw.is_empty() && genres_raw != "[]" {
                vec![genres_raw]
            } else {
                vec![]
            }
        });

        let books_json: String = row.get::<&str, String>("books_json").unwrap_or_else(|_| "[]".to_string());
        
        Ok(ProjectRow {
            id: row.get("id")?,
            name: row.get("name")?,
            series_name: row.get::<&str, Option<String>>("series_name")?.unwrap_or_default(),
            volume_number: row.get::<&str, Option<i32>>("volume_number")?.unwrap_or(1),
            project_type: row.get("type")?,
            book_count: row.get("actual_book_count")?,
            genres: parsed_genres,
            pov: row.get::<&str, Option<String>>("pov")?.unwrap_or_default(),
            description: row.get::<&str, Option<String>>("description")?.unwrap_or_default(),
            created_at: row.get::<&str, Option<i64>>("created_at")?.unwrap_or(0), 
            updated_at: row.get::<&str, Option<i64>>("updated_at")?.unwrap_or(0),
            books: serde_json::from_str(&books_json).unwrap_or_else(|_| vec![]),
        })
    }).map_err(|e| e.to_string())?;

    project_rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_project_by_id(state: tauri::State<'_, AppState>, id: String) -> Result<ProjectRow, String> {
    let conn = state.db.lock().unwrap();

    let mut stmt = conn.prepare(
        "SELECT 
            p.id, 
            p.name, 
            p.series_name, 
            p.volume_number, 
            p.type, 
            p.book_count, 
            p.genres, 
            p.pov, 
            p.description, 
            p.created_at, 
            p.updated_at, 
            COALESCE(
                (SELECT json_group_array(
                    json_object('id', b.id, 'title', b.title, 'orderIndex', b.order_index)
                ) FROM books b WHERE b.project_id = p.id),
                '[]'
            ) as books_json 
        FROM projects p
        WHERE p.id = ?1"
    ).map_err(|e| e.to_string())?;

    let project = stmt.query_row([id], |row| {
        let genres_raw: String = row.get("genres").unwrap_or_else(|_| "[]".to_string());
        let books_raw: String = row.get("books_json").unwrap_or_else(|_| "[]".to_string()); 

        Ok(ProjectRow {
            id: row.get("id")?,
            name: row.get("name")?,
            series_name: row.get::<_, Option<String>>("series_name")?.unwrap_or_default(),
            volume_number: row.get::<_, Option<i32>>("volume_number")?.unwrap_or(1),
            project_type: row.get("type")?,
            book_count: row.get("book_count")?,
            // genre field removed to match updated ProjectRow struct
            genres: serde_json::from_str(&genres_raw).unwrap_or_else(|_| vec![]),
            pov: row.get::<_, Option<String>>("pov")?.unwrap_or_default(),
            description: row.get::<_, Option<String>>("description")?.unwrap_or_default(),
            created_at: row.get::<_, Option<i64>>("created_at")?.unwrap_or(0), 
            updated_at: row.get::<_, Option<i64>>("updated_at")?.unwrap_or(0),
            books: serde_json::from_str(&books_raw).unwrap_or_else(|_| vec![]),
        })
    }).map_err(|e| e.to_string())?;

    Ok(project)
}

#[tauri::command]
async fn get_project_books(
    state: tauri::State<'_, AppState>, 
    project_id: String
) -> Result<Vec<BookRow>, String> {
    let conn = state.db.lock().unwrap();

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

    // Collect results into a Vec, automatically handling potential errors
    book_rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_book_documents(
    state: tauri::State<'_, AppState>, 
    book_id: String
) -> Result<Vec<ManuscriptDoc>, String> {
    let conn = state.db.lock().unwrap();

    let mut stmt = conn
        .prepare(
            "SELECT 
                id, project_id, book_id, parent_id, title, content, 
                doc_type, version, is_archived, order_index, created_at, updated_at 
             FROM documents 
             WHERE book_id = ?1 AND is_archived = 0 AND deleted_at IS NULL
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

    doc_rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command(rename_all = "snake_case")]
async fn update_project(
    state: tauri::State<'_, AppState>,
    id: String,
    name: String,
    series_name: String,
    volume_number: i32,
    description: String,
    genres: Vec<String>,
    project_type: String,
    pov: String,
) -> Result<(), String> {
    let conn = state.db.lock().unwrap();
    
    // Convert the vector into a JSON string for storage in the 'genres' column
    let genres_json = serde_json::to_string(&genres).unwrap_or_else(|_| "[]".to_string());
    
    let primary_genre = genres.first().cloned().unwrap_or_else(|| "".to_string());

    conn.execute(
        "UPDATE projects SET 
         name = ?1, 
         series_name = ?2, 
         volume_number = ?3, 
         description = ?4, 
         genre = ?5, 
         genres = ?6, 
         type = ?7, 
         pov = ?8, 
         updated_at = strftime('%s', 'now')
         WHERE id = ?9",
        (
            name, 
            series_name, 
            volume_number, 
            description, 
            primary_genre, // Legacy column still gets the first genre
            genres_json,   // The source of truth
            project_type, 
            pov, 
            id
        ),
    ).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
async fn update_book_title(state: tauri::State<'_, AppState>, id: String, title: String) -> Result<(), String> {
    let conn = state.db.lock().unwrap();
    conn.execute(
        "UPDATE books SET title = ?1 WHERE id = ?2",
        (title, id),
    ).map_err(|e| e.to_string())?;
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
    ).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command(rename_all = "snake_case")]
async fn delete_project(state: tauri::State<'_, AppState>, id: String) -> Result<(), String> {
    let conn = state.db.lock().unwrap();
    let now = chrono::Utc::now().timestamp();

    conn.execute(
        "UPDATE projects SET deleted_at = ?1 WHERE id = ?2",
        params![now, id],
    ).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command(rename_all = "snake_case")]
async fn delete_book(state: tauri::State<'_, AppState>, id: String, project_id: String) -> Result<(), String> {
    let conn = state.db.lock().unwrap();
    let now = chrono::Utc::now().timestamp();

    // Delete the book
    conn.execute("DELETE FROM books WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;

    // Re-sequence and update Project Metadata
    let mut stmt = conn.prepare(
        "SELECT id FROM books WHERE project_id = ?1 ORDER BY order_index ASC"
    ).map_err(|e| e.to_string())?;
    
    let book_ids: Vec<String> = stmt
        .query_map([&project_id], |row| row.get(0))
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    for (i, b_id) in book_ids.iter().enumerate() {
        conn.execute(
            "UPDATE books SET order_index = ?1 WHERE id = ?2",
            params![i as i32, b_id],
        ).map_err(|e| e.to_string())?;
    }

    let remaining_count = book_ids.len() as i32;

    // 3. Update the Project (Sync the count and the type)
    if remaining_count <= 1 {
        conn.execute(
            "UPDATE projects SET 
                type = 'standalone', 
                series_name = '', 
                book_count = 1,
                updated_at = ?1 
             WHERE id = ?2",
            params![now, &project_id],
        ).map_err(|e| e.to_string())?;
    } else {
        conn.execute(
            "UPDATE projects SET 
                book_count = ?1, 
                updated_at = ?2 
             WHERE id = ?3",
            params![remaining_count, now, &project_id],
        ).map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[tauri::command(rename_all = "snake_case")]
async fn delete_document(
    state: tauri::State<'_, AppState>, 
    id: String, 
    book_id: String
) -> Result<(), String> {
    let conn = state.db.lock().unwrap();
    let now = chrono::Utc::now().timestamp();

    // Soft delete the target document
    conn.execute(
        "UPDATE documents SET deleted_at = ?1 WHERE id = ?2",
        params![now, id],
    ).map_err(|e| e.to_string())?;

    // Fetch all remaining chapters
    let mut stmt = conn.prepare(
        "SELECT id, title FROM documents 
         WHERE book_id = ?1 AND doc_type = 'chapter' AND deleted_at IS NULL 
         ORDER BY order_index ASC"
    ).map_err(|e| e.to_string())?;

    // Store both ID and Title
    let chapters: Vec<(String, String)> = stmt
        .query_map([book_id], |row| Ok((row.get(0)?, row.get(1)?)))
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    // Smart Re-sequencing
    for (i, (chap_id, current_title)) in chapters.iter().enumerate() {
        let new_pos = i as i32;
        let expected_number = new_pos + 1;
        let default_pattern = format!("Chapter ");

        // Check: Does the title start with "Chapter "? 
        // If so, we assume it's an auto-generated name and update it.
        if current_title.starts_with(&default_pattern) {
            let new_title = format!("Chapter {}", expected_number);
            conn.execute(
                "UPDATE documents SET title = ?1, order_index = ?2 WHERE id = ?3",
                params![new_title, new_pos, chap_id],
            ).map_err(|e| e.to_string())?;
        } else {
            // It's a custom name - keep the title, just update the position.
            conn.execute(
                "UPDATE documents SET order_index = ?1 WHERE id = ?2",
                params![new_pos, chap_id],
            ).map_err(|e| e.to_string())?;
        }
    }

    Ok(())
}

#[tauri::command]
async fn get_trashed_projects(state: tauri::State<'_, AppState>) -> Result<Vec<ProjectRow>, String> {
    let conn = state.db.lock().unwrap();

    let mut stmt = conn.prepare(
        "SELECT 
            p.id, 
            p.name, 
            p.series_name, 
            p.volume_number, 
            p.type, 
            p.book_count, 
            p.genres, 
            p.pov, 
            p.description, 
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
        ORDER BY p.deleted_at DESC"
    ).map_err(|e| e.to_string())?;

    let rows = stmt.query_map([], |row| {
        // Fetch raw JSON strings with defaults
        let genres_raw: String = row.get::<&str, Option<String>>("genres")?
            .unwrap_or_else(|| "[]".to_string());
        let books_raw: String = row.get::<&str, String>("books_json")
            .unwrap_or_else(|_| "[]".to_string());

        Ok(ProjectRow {
            id: row.get("id")?,
            name: row.get("name")?,
            series_name: row.get::<&str, Option<String>>("series_name")?.unwrap_or_default(),
            volume_number: row.get::<&str, Option<i32>>("volume_number")?.unwrap_or(1),
            project_type: row.get("type")?,
            book_count: row.get("book_count")?,
            genres: serde_json::from_str(&genres_raw).unwrap_or_else(|_| vec![]),
            pov: row.get::<&str, Option<String>>("pov")?.unwrap_or_default(),
            description: row.get::<&str, Option<String>>("description")?.unwrap_or_default(),
            created_at: row.get::<&str, Option<i64>>("created_at")?.unwrap_or(0),
            updated_at: row.get::<&str, Option<i64>>("updated_at")?.unwrap_or(0),
            books: serde_json::from_str(&books_raw).unwrap_or_else(|_| vec![]),
        })
    }).map_err(|e| e.to_string())?;

    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command]
async fn restore_project(state: tauri::State<'_, AppState>, id: String) -> Result<(), String> {
    let conn = state.db.lock().unwrap();

    conn.execute(
        "UPDATE projects SET deleted_at = NULL WHERE id = ?1", 
        [id]
    ).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
async fn purge_project(state: tauri::State<'_, AppState>, id: String) -> Result<(), String> {
    let conn = state.db.lock().unwrap();
    
    // Delete the project (Foreign keys will handle books/docs if ON DELETE CASCADE is set)
    conn.execute("DELETE FROM projects WHERE id = ?1", [id])
        .map_err(|e| e.to_string())?;
    
    // VACUUM cleans up unused space and shrinks the database file
    conn.execute("VACUUM", [])
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
async fn empty_trash(state: tauri::State<'_, AppState>) -> Result<(), String> {
    let conn = state.db.lock().unwrap();

    // Wipe all projects marked for deletion
    conn.execute("DELETE FROM projects WHERE deleted_at IS NOT NULL", [])
        .map_err(|e| e.to_string())?;
    
    // Reclaim disk space
    conn.execute("VACUUM", [])
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command(rename_all = "snake_case")]
async fn set_expanded_chapters(
    state: tauri::State<'_, AppState>, 
    project_id: String, 
    ids: Vec<String>
) -> Result<(), String> {
    let conn = state.db.lock().unwrap();
    let json_ids = serde_json::to_string(&ids).map_err(|e| e.to_string())?;

    conn.execute(
        "INSERT OR REPLACE INTO user_preferences (id, project_id, pref_key, pref_value) 
         VALUES (?1, ?2, 'expanded_chapters', ?3)",
        params![format!("{}_exp", project_id), project_id, json_ids],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command(rename_all = "snake_case")]
async fn get_expanded_chapters(
    app_handle: tauri::AppHandle, 
    project_id: String
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
    ).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command(rename_all = "snake_case")]
async fn get_last_active_book(
    app_handle: tauri::AppHandle,
    project_id: String,
) -> Result<String, String> {
    let path = get_db_path(&app_handle)?;
    let conn = Connection::open(path).map_err(|e| e.to_string())?;

    let res: Result<String, _> = conn.query_row(
        "SELECT pref_value FROM user_preferences WHERE project_id = ?1 AND pref_key = 'last_active_book'",
        [project_id],
        |row| row.get(0),
    );

    res.map_err(|e| e.to_string())
}

#[tauri::command(rename_all = "snake_case")]
async fn set_user_preference(
    state: tauri::State<'_, AppState>,
    project_id: String,
    key: String,
    value: String,
) -> Result<(), String> {
    let conn = state.db.lock().unwrap();

    // We generate a unique ID for the row based on project + key
    // This matches your existing pattern (e.g., project123_active_tab)
    let pref_id = format!("{}_{}", project_id, key);

    conn.execute(
        "INSERT OR REPLACE INTO user_preferences (id, project_id, pref_key, pref_value) 
         VALUES (?1, ?2, ?3, ?4)",
        params![pref_id, project_id, key, value],
    ).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command(rename_all = "snake_case")]
async fn get_user_preference(
    state: tauri::State<'_, AppState>,
    project_id: String,
    key: String,
) -> Result<String, String> {
    let conn = state.db.lock().unwrap();

    let res: Result<String, _> = conn.query_row(
        "SELECT pref_value FROM user_preferences WHERE project_id = ?1 AND pref_key = ?2",
        params![project_id, key],
        |row| row.get(0),
    );

    match res {
        Ok(val) => Ok(val),
        Err(_) => Ok("".to_string()),
    }
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
    ).map_err(|e| e.to_string())?;

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

            if let Some(window) = app.get_webview_window("main") {
                // Get the monitor the window is on or default to the primary monitor
                if let Ok(Some(monitor)) = window.primary_monitor() {
                    let size = monitor.size();
                    
                    // Calculate a comfortable "native" feel: 70% width, 80% height
                    let mut width = size.width as f64 * 0.7;
                    let mut height = size.height as f64 * 0.8;

                    // Safety Clamping: Ensure the UI doesn't break on low-res displays
                    if width < 1000.0 { width = 1000.0; }
                    if height < 700.0 { height = 700.0; }
                    
                    let _ = window.set_size(tauri::LogicalSize::new(width, height));
                    let _ = window.center();
                }
            }

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
            update_project,
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
            rename_document
            ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}