use crate::models::character::{Character, CharacterMetadata, TemporalField, PortraitFrame};
use crate::AppState;
use chrono::Utc;
use rusqlite::{params, Connection, OptionalExtension};
use uuid::Uuid;

#[tauri::command]
pub async fn create_character(
    app_handle: tauri::AppHandle,
    project_id: String,
    book_id: Option<String>,
    display_name: String,
    role: String,
    race: String, // take from the UI to set the initial value
    mut metadata: CharacterMetadata,
) -> Result<Character, String> {
    let path = crate::get_db_path(&app_handle)?;
    let conn = Connection::open(path).map_err(|e| e.to_string())?;

    let id = Uuid::new_v4().to_string();
    let now = Utc::now().timestamp();

    // Initialize Age/Mortality fields
    if metadata.age_value.is_none() {
        metadata.age_value = Some(TemporalField::<Option<i32>>::default());
    }
    if metadata.age_is_unknown.is_none() {
        metadata.age_is_unknown = Some(TemporalField::<bool>::default());
    }
    if metadata.mortality.is_none() {
        metadata.mortality = Some(TemporalField::<String>::default());
    }

    if metadata.race.is_none() {
        metadata.race = Some(TemporalField {
            global_value: race,
            book_overrides: std::collections::HashMap::new(),
        });
    }

    let metadata_json = serde_json::to_string(&metadata).map_err(|e| e.to_string())?;
    let overrides_json: Option<String> = None;

    conn.execute(
        "INSERT INTO characters (id, project_id, book_id, display_name, role, metadata, last_modified, book_overrides)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        params![id, project_id, book_id, display_name, role, metadata_json, now, overrides_json],
    ).map_err(|e| e.to_string())?;

    Ok(Character {
        id,
        project_id,
        book_id,
        display_name,
        role,
        portrait_path: None,
        is_global: true,
        last_modified: now,
        metadata,
        book_overrides: None,
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
        .prepare("SELECT id, project_id, book_id, display_name, role, portrait_path, is_global, last_modified, metadata, book_overrides 
                  FROM characters WHERE project_id = ?1")
        .map_err(|e| e.to_string())?;

    let character_iter = stmt
        .query_map(params![project_id], |row| {
            let metadata_str: String = row.get(8)?;
            let overrides_str: Option<String> = row.get(9)?;

            let metadata: CharacterMetadata = serde_json::from_str(&metadata_str)
                .unwrap_or_else(|_| CharacterMetadata::default());

            let book_overrides: Option<serde_json::Value> =
                overrides_str.and_then(|s| serde_json::from_str(&s).ok());

            Ok(Character {
                id: row.get(0)?,
                project_id: row.get(1)?,
                book_id: row.get(2)?,
                display_name: row.get(3)?,
                role: row.get(4)?,
                portrait_path: row.get(5)?,
                is_global: row.get(6)?,
                last_modified: row.get(7)?,
                metadata,
                book_overrides,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut results = Vec::new();
    for char in character_iter {
        results.push(char.map_err(|e| e.to_string())?);
    }
    Ok(results)
}

#[tauri::command]
pub async fn get_character(app_handle: tauri::AppHandle, id: String) -> Result<Character, String> {
    let path = crate::get_db_path(&app_handle)?;
    let conn = Connection::open(path).map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare("SELECT id, project_id, book_id, display_name, role, portrait_path, is_global, last_modified, metadata, book_overrides 
                  FROM characters WHERE id = ?1")
        .map_err(|e| e.to_string())?;

    let character = stmt
        .query_row(params![id], |row| {
            let character_id: String = row.get(0)?;
            let metadata_str: String = row.get(8)?;
            let mut metadata: CharacterMetadata = serde_json::from_str(&metadata_str)
                .unwrap_or_else(|_| CharacterMetadata::default());

            // INJECT THE ID: This ensures metadata.id is never undefined in React
            metadata.id = Some(character_id.clone());

            let overrides_str: Option<String> = row.get(9)?;
            let book_overrides: Option<serde_json::Value> =
                overrides_str.and_then(|s| serde_json::from_str(&s).ok());

            Ok(Character {
                id: character_id,
                project_id: row.get(1)?,
                book_id: row.get(2)?,
                display_name: row.get(3)?,
                role: row.get(4)?,
                portrait_path: row.get(5)?,
                is_global: row.get(6)?,
                last_modified: row.get(7)?,
                metadata,
                book_overrides,
            })
        })
        .map_err(|e| e.to_string())?;

    Ok(character)
}

#[tauri::command]
pub async fn update_character(
    state: tauri::State<'_, AppState>,
    mut character: Character,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let now = Utc::now().timestamp();

    // 1. Logic Layer: Derive display_name from metadata struct fields
    let first = character.metadata.first_name.trim();
    let middle = character
        .metadata
        .middle_name
        .as_deref()
        .unwrap_or("")
        .trim();
    let last = character.metadata.last_name.as_deref().unwrap_or("").trim();

    let name_parts: Vec<&str> = vec![first, middle, last]
        .into_iter()
        .filter(|s| !s.is_empty())
        .collect();

    if !name_parts.is_empty() {
        character.display_name = name_parts.join(" ");
    }

    let metadata_json = serde_json::to_string(&character.metadata).map_err(|e| e.to_string())?;
    let overrides_json =
        serde_json::to_string(&character.book_overrides).map_err(|e| e.to_string())?;

    db.execute(
        "UPDATE characters SET 
            display_name = ?1, 
            role = ?2, 
            portrait_path = ?3, 
            is_global = ?4, 
            metadata = ?5, 
            last_modified = ?6,
            book_id = ?7,
            book_overrides = ?8
            WHERE id = ?9",
        params![
            character.display_name,
            character.role,
            character.portrait_path,
            character.is_global,
            metadata_json,
            now,
            character.book_id,
            overrides_json,
            character.id
        ],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command(rename_all = "snake_case")]
pub async fn update_character_portrait(
    app_handle: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    id: String,
    path: Option<String>,
    book_id: Option<String>,
    zoom: f64,
    offset_x: f64,
    offset_y: f64,
) -> Result<(), String> {
    let conn = state.db.lock().unwrap();

    // 1. Fetch current state
    let (old_path, metadata_str): (Option<String>, String) = conn
        .query_row(
            "SELECT portrait_path, metadata FROM characters WHERE id = ?1",
            [&id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .map_err(|e| e.to_string())?;

    let mut final_column_path = old_path.clone();

    // ONLY delete the old file if we are updating the GLOBAL portrait 
    // and the path is actually changing.
    if book_id.is_none() {
        if let Some(ref old) = old_path {
            if Some(old) != path.as_ref() {
                let _ = crate::commands::media::internal_delete_asset_file(&app_handle, old);
            }
        }
        final_column_path = path.clone();
    }

    // 3. Update the Temporal Metadata
    let mut metadata: CharacterMetadata = serde_json::from_str(&metadata_str).unwrap_or_default();
    let mut temporal_data = metadata.portrait_data.unwrap_or_default();

    // Use the values passed from the frontend arguments
    let new_frame = PortraitFrame {
        path: path.clone().unwrap_or_default(),
        zoom,
        offset_x,
        offset_y,
    };

    if let Some(bid) = book_id {
        // If we are in a book, update the override JSON only
        temporal_data.book_overrides.insert(bid, new_frame);
    } else {
        // If global, update the main frame and the column
        temporal_data.global_value = new_frame.clone();
    }

    metadata.portrait_data = Some(temporal_data);
    let updated_metadata_json = serde_json::to_string(&metadata).map_err(|e| e.to_string())?;

    // 4. Final Database Update
    conn.execute(
        "UPDATE characters SET portrait_path = ?1, metadata = ?2, last_modified = ?3 WHERE id = ?4",
        (&final_column_path, updated_metadata_json, chrono::Utc::now().timestamp(), &id),
    ).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn delete_character(
    app_handle: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    id: String,
) -> Result<(), String> {
    let conn = state.db.lock().unwrap();

    // 1. Get the portrait path before we delete the DB record
    let portrait_path: Option<String> = conn
        .query_row(
            "SELECT portrait_path FROM characters WHERE id = ?1",
            [&id],
            |row| row.get(0),
        )
        .optional()
        .map_err(|e| e.to_string())?
        .flatten();

    // 2. Delete the portrait file if it exists
if let Some(path) = portrait_path {
    let _ = crate::commands::media::internal_delete_asset_file(&app_handle, &path);
}

    // 3. Delete from DB
    conn.execute("DELETE FROM characters WHERE id = ?1", [&id])
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
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}
