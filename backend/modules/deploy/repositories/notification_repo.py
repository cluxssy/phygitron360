from typing import List, Dict, Any, Optional
from backend.core.database import get_db_connection
from psycopg2.extras import RealDictCursor

class NotificationRepository:
    def create_notification(self, employee_code: Optional[str], title: str, message: str, n_type: str = 'Info'):
        conn = get_db_connection()
        try:
            with conn.cursor() as cur:
                cur.execute('''
                    INSERT INTO notifications (employee_code, title, message, type)
                    VALUES (%s, %s, %s, %s)
                ''', (employee_code, title, message, n_type))
                conn.commit()
        finally:
            conn.close()

    def get_notifications_for_user(self, employee_code: str, limit: int = 10, unread_only: bool = False) -> List[Dict[str, Any]]:
        conn = get_db_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                query = 'SELECT * FROM notifications WHERE (employee_code = %s OR employee_code IS NULL)'
                if unread_only:
                    query += ' AND is_read = 0'
                query += ' ORDER BY created_at DESC LIMIT %s'
                cur.execute(query, (employee_code, limit))
                rows = cur.fetchall()
                return [dict(r) for r in rows]
        finally:
            conn.close()

    def get_admin_notifications(self, limit: int = 15, unread_only: bool = False) -> List[Dict[str, Any]]:
        conn = get_db_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                query = "SELECT * FROM notifications WHERE (employee_code IS NULL OR type = 'AdminAlert')"
                if unread_only:
                    query += ' AND is_read = 0'
                query += ' ORDER BY created_at DESC LIMIT %s'
                cur.execute(query, (limit,))
                rows = cur.fetchall()
                return [dict(r) for r in rows]
        finally:
            conn.close()

    def mark_as_read(self, notification_id: int):
        conn = get_db_connection()
        try:
            with conn.cursor() as cur:
                cur.execute('UPDATE notifications SET is_read = 1 WHERE id = %s', (notification_id,))
                conn.commit()
        finally:
            conn.close()

    def mark_all_as_read(self, employee_code: str, is_admin: bool = False):
        conn = get_db_connection()
        try:
            with conn.cursor() as cur:
                if is_admin:
                    # Admins mark their own + global/admin alerts as read
                    cur.execute('''
                        UPDATE notifications 
                        SET is_read = 1 
                        WHERE (employee_code = %s OR employee_code IS NULL OR type = 'AdminAlert') AND is_read = 0
                    ''', (employee_code,))
                else:
                    cur.execute('UPDATE notifications SET is_read = 1 WHERE employee_code = %s AND is_read = 0', (employee_code,))
                conn.commit()
        finally:
            conn.close()

    def mark_notifications_by_query(self, title: str, message_part: str):
        conn = get_db_connection()
        try:
            with conn.cursor() as cur:
                cur.execute('''
                    UPDATE notifications 
                    SET is_read = 1 
                    WHERE title = %s AND message LIKE %s AND is_read = 0
                ''', (title, f'%{message_part}%'))
                conn.commit()
        finally:
            conn.close()

    def get_unread_count(self, employee_code: Optional[str], is_admin: bool = False) -> int:
        conn = get_db_connection()
        try:
            with conn.cursor() as cur:
                if is_admin:
                    cur.execute('''
                        SELECT count(*) FROM notifications 
                        WHERE (employee_code IS NULL OR type = 'AdminAlert') AND is_read = 0
                    ''')
                    row = cur.fetchone()
                else:
                    cur.execute('''
                        SELECT count(*) FROM notifications 
                        WHERE employee_code = %s AND is_read = 0
                    ''', (employee_code,))
                    row = cur.fetchone()
                return row[0] if row else 0
        finally:
            conn.close()

