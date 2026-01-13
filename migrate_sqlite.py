
import sqlite3

def migrate():
    try:
        conn = sqlite3.connect('kaushal_setu.db')
        cursor = conn.cursor()
        cursor.execute("ALTER TABLE internal_emails ADD COLUMN is_deleted_by_sender BOOLEAN DEFAULT 0")
        conn.commit()
        print("Migration successful.")
    except Exception as e:
        print(f"Migration error (already exists?): {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
