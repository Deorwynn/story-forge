use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Serialize, Deserialize)]
pub struct Character {
    pub id: String,
    pub project_id: String,
    pub book_id: Option<String>,
    pub display_name: String,
    pub role: String,
    pub portrait_path: Option<String>,
    pub is_global: bool,
    pub last_modified: i64,
    pub metadata: CharacterMetadata,
    pub book_overrides: Option<serde_json::Value>, 
}

// A wrapper to handle the "Global vs Book-Specific" logic
#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct TemporalField<T> {
    pub global_value: T,
    pub book_overrides: HashMap<String, T>, // Key is book_id
}

#[derive(Debug, Serialize, Deserialize, Default)]
pub struct CharacterMetadata {
    pub first_name: String,
    pub middle_name: Option<String>,
    pub last_name: Option<String>,
    pub nickname: Option<String>,
    pub languages: Vec<String>,
    pub gender: Option<TemporalField<String>>,
    pub occupation: Option<TemporalField<String>>,
    pub race: Option<TemporalField<String>>,
    pub age_value: Option<TemporalField<Option<i32>>>,
    pub age_is_unknown: Option<TemporalField<bool>>,
    pub mortality: Option<TemporalField<String>>,
}