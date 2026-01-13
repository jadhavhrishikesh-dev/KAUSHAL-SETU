
import sqlite3

def migrate():
    conn = sqlite3.connect('kaushal_setu.db')
    cursor = conn.cursor()
    
    migrations = [
        ("ALTER TABLE internal_emails ADD COLUMN is_encrypted BOOLEAN DEFAULT 0", "is_encrypted"),
        ("ALTER TABLE email_recipients ADD COLUMN is_starred BOOLEAN DEFAULT 0", "is_starred"),
        ("""
            CREATE TABLE IF NOT EXISTS email_drafts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                subject TEXT DEFAULT '',
                body TEXT DEFAULT '',
                recipient_ids_json TEXT DEFAULT '[]',
                target_type TEXT DEFAULT 'individual',
                target_value TEXT DEFAULT '',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users_auth(user_id)
            )
        """, "email_drafts table"),
        ("""
            CREATE TABLE IF NOT EXISTS rate_limit_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                action TEXT NOT NULL,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users_auth(user_id)
            )
        """, "rate_limit_logs table")
    ]
    
    for sql, name in migrations:
        try:
            cursor.execute(sql)
            print(f"✓ Applied: {name}")
        except Exception as e:
            print(f"✗ Skipped {name}: {e}")
    
    conn.commit()
    conn.close()
    print("\nMigration complete.")

if __name__ == "__main__":
    migrate()
