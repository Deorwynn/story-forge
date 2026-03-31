use serde::{Deserialize, Serialize};

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
}

#[derive(Debug, Serialize, Deserialize, Default)] 
pub struct CharacterMetadata {
    pub first_name: String,
    pub middle_name: Option<String>,
    pub last_name: Option<String>,
    pub nickname: Option<String>,
    pub gender: Option<String>,
    pub base_age: i32,
    pub languages: Vec<String>,
}