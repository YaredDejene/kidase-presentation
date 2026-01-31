use tauri_plugin_sql::{Migration, MigrationKind};

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![
        Migration {
            version: 1,
            description: "create_initial_tables",
            sql: r#"
                CREATE TABLE IF NOT EXISTS templates (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    max_lang_count INTEGER NOT NULL DEFAULT 4,
                    definition_json TEXT NOT NULL,
                    created_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS presentations (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    type TEXT NOT NULL,
                    template_id TEXT NOT NULL,
                    language_map TEXT NOT NULL,
                    is_active INTEGER NOT NULL DEFAULT 0,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY (template_id) REFERENCES templates(id)
                );

                CREATE TABLE IF NOT EXISTS slides (
                    id TEXT PRIMARY KEY,
                    presentation_id TEXT NOT NULL,
                    slide_order INTEGER NOT NULL,
                    line_id TEXT,
                    title_json TEXT,
                    blocks_json TEXT NOT NULL,
                    notes TEXT,
                    is_disabled INTEGER NOT NULL DEFAULT 0,
                    FOREIGN KEY (presentation_id) REFERENCES presentations(id)
                );

                CREATE TABLE IF NOT EXISTS variables (
                    id TEXT PRIMARY KEY,
                    presentation_id TEXT NOT NULL,
                    name TEXT NOT NULL,
                    value TEXT NOT NULL,
                    FOREIGN KEY (presentation_id) REFERENCES presentations(id)
                );

                CREATE INDEX IF NOT EXISTS idx_slides_presentation
                    ON slides(presentation_id, slide_order);

                CREATE INDEX IF NOT EXISTS idx_variables_presentation
                    ON variables(presentation_id);
            "#,
            kind: MigrationKind::Up,
        },
    ];

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:kidase.db", migrations)
                .build(),
        )
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
