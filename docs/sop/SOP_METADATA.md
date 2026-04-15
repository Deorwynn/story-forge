# SOP-001: Character Metadata & Temporal Inheritance

## 1. Core Philosophy: The Chronological Record

The Series Bible is not a static document; it is a **chronological narrative engine**. A character's traits (Occupation, Age, Rank) often evolve across a series. We use a Temporal Inheritance Model to ensure that data flows forward through the series unless explicitly overridden in a specific book.

- **Goal**: Maintain a single source of truth that reflects changes over time.
- **Mechanism**: Data flows forward through volumes via Temporal Inheritance unless an explicit override is created.

## 2. Technical Architecture

### 2.1 The TemporalField<T> Pattern

To distinguish between "Global" defaults and "Book-Specific" snapshots, every metadata trait must follow this structure:

| Key              | Type                | Description                                                        |
| ---------------- | ------------------- | ------------------------------------------------------------------ |
| `global_value`   | `T`                 | The "base" state of the character (e.g., used in Volume 1).        |
| `book_overrides` | `Record<string, T>` | A map where keys are Book UUIDs and values are specific overrides. |

## 2.2. The Inheritance Algorithm (Backwards Walking)

To determine the "Effective Value" of a field for any given book, the system must perform a Reverse Walk:

- **Check Active Book**: Does an entry exist in `book_overrides[activeBookId]`?
- **Walk Backwards**: If not, move to index - 1 in the project.books array and repeat step 1.
- **Global Fallback**: If no overrides are found in the current or previous books and the start of the series is reached with no overrides, return `global_value`.
- **The Null Rule**: A value of `null` is a terminal stop. If a user explicitly clears a field in Volume 2, the walker stops there and returns null rather than continuing to the Global value.

### 2.3 Implementation Details

Data is stored in the characters table as a JSONB/JSON string in the metadata column.

> ##### Rust
>
> `pub struct Metadata {`  
> `  pub occupation: TemporalField<String>,`  
> `  pub race: TemporalField<String>,`  
> `   pub age: AgeGroup, // Complex group containing multiple fields  `  
> `}`

> ##### TypeScript
>
> `interface TemporalField<T> {`  
> `  global_value: T;`  
> `  book_overrides: Record<string, T>; // Key is Book UUID`  
> `}`

## 3. The UI Layer (SmartField)

All metadata inputs must be wrapped in a **_SmartField_** component.

- **Display Mode**: Shows the effective value + InheritanceIndicator.
- **Edit Mode**: Swaps the display text for a functional input (Text, Area, or Toggle).
- **Source Labeling**: The InheritanceIndicator must visually distinguish if a value is Direct (this book), Inherited (previous book), or Global.

## 4. Standard Operating Procedure for Adding Fields

Follow these steps to add a new character trait (e.g., "Social Standing") to the character sheet:

### Step A: Backend (Rust/SQLite)

1. Update the `Metadata` struct in `src-tauri/src/models/character.rs`.
2. Ensure the field is wrapped in `TemporalField<T>`.

### Step B: Frontend (TypeScript)

1. Update the `CharacterMetadata` interface in `src/types/character.ts`.
2. Add the new key to any initial state or mock data constants.

### Step C: UI Integration

1. Place a new `SmartField` instance in one of the character sheet sections (e.g., CharacterSheetIdentity.tsx).
2. Connect it to the character update handler using the correct metadata path (e.g., `metadata.social_rank`).

## 5. Mandatory Validation Checklist

Before merging a new metadata field, you must verify the following lifecycle:

1. **Global Inheritance**: Set a value in Book 1; verify it appears automatically in Books 2 and 3.
2. **Override Integrity**: Set a different value in Book 2; verify Book 1 remains unchanged while Book 3 adopts the new Book 2 value.
3. **Link Severance**: While Book 2 has an override, change the value in Book 1. Verify that Book 2 retains its specific override and does not update.
4. **The "Snap-Back" Test**: Clear the value in Book 2 (set to null). Ensure the input stays empty and does not revert to the Book 1 value automatically.
5. **Reversion**: Delete the override entirely; verify the field correctly "re-links" to the nearest previous value or Global default.
