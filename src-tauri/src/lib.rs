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
        Migration {
            version: 2,
            description: "add_footer_to_slides",
            sql: r#"
                ALTER TABLE slides ADD COLUMN footer_json TEXT;
            "#,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "add_language_settings_to_presentations",
            sql: r#"
                ALTER TABLE presentations ADD COLUMN language_settings TEXT;
            "#,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 4,
            description: "create_app_settings_table",
            sql: r#"
                CREATE TABLE IF NOT EXISTS app_settings (
                    key TEXT PRIMARY KEY,
                    value TEXT NOT NULL
                );
            "#,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 5,
            description: "create_rule_definitions_table",
            sql: r#"
                CREATE TABLE IF NOT EXISTS rule_definitions (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    scope TEXT NOT NULL,
                    presentation_id TEXT,
                    slide_id TEXT,
                    rule_json TEXT NOT NULL,
                    is_enabled INTEGER NOT NULL DEFAULT 1,
                    created_at TEXT NOT NULL
                );

                CREATE INDEX IF NOT EXISTS idx_rules_presentation
                    ON rule_definitions(presentation_id);

                CREATE INDEX IF NOT EXISTS idx_rules_slide
                    ON rule_definitions(slide_id);

                CREATE INDEX IF NOT EXISTS idx_rules_scope
                    ON rule_definitions(scope);
            "#,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 6,
            description: "add_per_language_variable_values",
            sql: r#"
                ALTER TABLE variables ADD COLUMN value_lang1 TEXT NOT NULL DEFAULT '';
                ALTER TABLE variables ADD COLUMN value_lang2 TEXT NOT NULL DEFAULT '';
                ALTER TABLE variables ADD COLUMN value_lang3 TEXT NOT NULL DEFAULT '';
                ALTER TABLE variables ADD COLUMN value_lang4 TEXT NOT NULL DEFAULT '';
            "#,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 7,
            description: "create_gitsawes_table",
            sql: r#"
                CREATE TABLE IF NOT EXISTS gitsawes (
                    id TEXT PRIMARY KEY,
                    line_id TEXT NOT NULL UNIQUE,
                    message_st_paul TEXT,
                    message_apostle TEXT,
                    message_book_of_acts TEXT,
                    misbak TEXT,
                    wengel TEXT,
                    kidase_type TEXT,
                    evangelist TEXT,
                    message_apostle_evangelist TEXT,
                    gitsawe_type TEXT,
                    priority INTEGER NOT NULL,
                    created_at TEXT NOT NULL
                );

                CREATE INDEX IF NOT EXISTS idx_gitsawes_priority
                    ON gitsawes(priority);

                CREATE INDEX IF NOT EXISTS idx_gitsawes_line_id
                    ON gitsawes(line_id);

                CREATE INDEX IF NOT EXISTS idx_gitsawes_gitsawe_type
                    ON gitsawes(gitsawe_type);

                ALTER TABLE rule_definitions ADD COLUMN gitsawe_id TEXT;

                CREATE INDEX IF NOT EXISTS idx_rules_gitsawe
                    ON rule_definitions(gitsawe_id);
            "#,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 8,
            description: "add_is_dynamic_to_slides",
            sql: r#"
                ALTER TABLE slides ADD COLUMN is_dynamic INTEGER NOT NULL DEFAULT 0;
            "#,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 9,
            description: "create_verses_table",
            sql: r#"
                CREATE TABLE IF NOT EXISTS verses (
                    id TEXT PRIMARY KEY,
                    segment_id TEXT NOT NULL,
                    verse_order INTEGER NOT NULL,
                    title_lang1 TEXT,
                    title_lang2 TEXT,
                    title_lang3 TEXT,
                    title_lang4 TEXT,
                    text_lang1 TEXT,
                    text_lang2 TEXT,
                    text_lang3 TEXT,
                    text_lang4 TEXT,
                    created_at TEXT NOT NULL
                );

                CREATE INDEX IF NOT EXISTS idx_verses_segment_id
                    ON verses(segment_id);
            "#,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 10,
            description: "add_template_override_id_to_slides",
            sql: "ALTER TABLE slides ADD COLUMN template_override_id TEXT;",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 11,
            description: "add_is_primary_to_presentations",
            sql: "ALTER TABLE presentations ADD COLUMN is_primary INTEGER NOT NULL DEFAULT 1;",
            kind: MigrationKind::Up,
        },
    ];

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:kidase.db", migrations)
                .build(),
        )
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
