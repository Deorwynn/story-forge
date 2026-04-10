use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Serialize, Deserialize)]
pub struct Character {
    pub id: String,
    pub project_id: String,
    pub book_id: Option<String>,
    pub display_name: String,
    pub role: String,
    pub race: String,
    pub portrait_path: Option<String>,
    pub is_global: bool,
    pub last_modified: i64,
    pub metadata: CharacterMetadata,
    pub book_overrides: Option<serde_json::Value>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AgeData {
    pub value: Option<i32>, // Some(25) or None (for "Unknown")
    pub is_unknown: bool,
    pub mortality: String,
}

impl Default for AgeData {
    fn default() -> Self {
        Self {
            value: None,
            is_unknown: true,
            mortality: "mortal".to_string(),
        }
    }
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
    pub gender: Option<String>,
    pub age: Option<TemporalField<AgeData>>, 
    pub languages: Vec<String>,
    pub occupation: Option<String>,
}