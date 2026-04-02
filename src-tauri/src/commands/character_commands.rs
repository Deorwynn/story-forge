use rusqlite::{params, Connection };
use uuid::Uuid;
use chrono::Utc;
use crate::AppState;
use crate::models::character::{Character, CharacterMetadata};

#[tauri::command]
pub async fn create_character(
    app_handle: tauri::AppHandle,
    project_id: String,
    book_id: Option<String>,
    display_name: String,
    role: String,   // Added this
    race: String,   // Added this
    metadata: CharacterMetadata,
) -> Result<Character, String> {
    let path = crate::get_db_path(&app_handle)?;
    let conn = Connection::open(path).map_err(|e| e.to_string())?;

    let id = Uuid::new_v4().to_string();
    let now = Utc::now().timestamp();
    let metadata_json = serde_json::to_string(&metadata).map_err(|e| e.to_string())?;

    conn.execute(
        "INSERT INTO characters (id, project_id, book_id, display_name, role, race, metadata, last_modified)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        params![id, project_id, book_id, display_name, role, race, metadata_json, now],
    ).map_err(|e| e.to_string())?;

    Ok(Character {
        id,
        project_id,
        book_id,
        display_name,
        role, // Use the passed variable
        race, // Use the passed variable
        portrait_path: None,
        is_global: true,
        last_modified: now,
        metadata,
    })
}

#[tauri::command]
pub async fn get_characters(
    app_handle: tauri::AppHandle,
    project_id: String,
) -> Result<Vec<Character>, String> {
    let path = crate::get_db_path(&app_handle)?;
    let conn = Connection::open(path).map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare("SELECT id, project_id, book_id, display_name, role, race, portrait_path, is_global, last_modified, metadata 
                  FROM characters WHERE project_id = ?1")
        .map_err(|e| e.to_string())?;

    let character_iter = stmt.query_map(params![project_id], |row| {
    let metadata_str: String = row.get(9)?;
    
    // Parse without the '?' here to avoid the type mismatch
    let metadata: CharacterMetadata = serde_json::from_str(&metadata_str)
        .unwrap_or_else(|_| CharacterMetadata::default());

        Ok(Character {
            id: row.get(0)?,
            project_id: row.get(1)?,
            book_id: row.get(2)?,
            display_name: row.get(3)?,
            role: row.get(4)?,
            race: row.get(5)?,
            portrait_path: row.get(6)?,
            is_global: row.get(7)?,
            last_modified: row.get(8)?,
            metadata,
        })
    }).map_err(|e| e.to_string())?;

    let mut results = Vec::new();
    for char in character_iter {
        results.push(char.map_err(|e| e.to_string())?);
    }
    Ok(results)
}

#[tauri::command]
pub async fn get_character(
    app_handle: tauri::AppHandle,
    id: String,
) -> Result<Character, String> {
    let path = crate::get_db_path(&app_handle)?;
    let conn = Connection::open(path).map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare("SELECT id, project_id, book_id, display_name, role, race, portrait_path, is_global, last_modified, metadata 
                  FROM characters WHERE id = ?1")
        .map_err(|e| e.to_string())?;

    let character = stmt.query_row(params![id], |row| {
        let metadata_str: String = row.get(9)?;
        let metadata: CharacterMetadata = serde_json::from_str(&metadata_str)
            .unwrap_or_else(|_| CharacterMetadata::default());

        Ok(Character {
            id: row.get(0)?,
            project_id: row.get(1)?,
            book_id: row.get(2)?,
            display_name: row.get(3)?,
            role: row.get(4)?,
            race: row.get(5)?,
            portrait_path: row.get(6)?,
            is_global: row.get(7)?,
            last_modified: row.get(8)?,
            metadata,
        })
    }).map_err(|e| e.to_string())?;

    Ok(character)
}

#[tauri::command]
pub async fn update_character(
    state: tauri::State<'_, AppState>,
    character: Character,
) -> Result<(), String> {
    // Lock the already-open connection
    let db = state.db.lock().map_err(|e| e.to_string())?;

    let now = Utc::now().timestamp();
    let metadata_json = serde_json::to_string(&character.metadata).map_err(|e| e.to_string())?;

    db.execute(
        "UPDATE characters SET 
            display_name = ?1, 
            role = ?2, 
            race = ?3, 
            portrait_path = ?4, 
            is_global = ?5, 
            metadata = ?6, 
            last_modified = ?7,
            book_id = ?8
         WHERE id = ?9",
        params![
            character.display_name,
            character.role,
            character.race,
            character.portrait_path,
            character.is_global,
            metadata_json,
            now,
            character.book_id,
            character.id
        ],
    ).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn delete_character(
    app_handle: tauri::AppHandle,
    id: String,
) -> Result<(), String> {
    let path = crate::get_db_path(&app_handle)?;
    let conn = Connection::open(path).map_err(|e| e.to_string())?;

    conn.execute("DELETE FROM characters WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn globalize_project_characters(
    app_handle: tauri::AppHandle,
    project_id: String,
) -> Result<(), String> {
    let path = crate::get_db_path(&app_handle)?;
    let conn = Connection::open(path).map_err(|e| e.to_string())?;

    conn.execute(
        "UPDATE characters SET book_id = NULL WHERE project_id = ?1",
        params![project_id],
    ).map_err(|e| e.to_string())?;

    Ok(())
}