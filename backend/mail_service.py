
from sqlalchemy.orm import Session
from sqlalchemy import desc
from . import models, schemas
from datetime import datetime
from .encryption import encrypt_message, decrypt_message

class MailService:
    @staticmethod
    def send_email(db: Session, email_data: schemas.EmailCreate, sender_id: int):
        # 1. Create Core Email Content (with encrypted body)
        # Encrypt the body using Fernet symmetric encryption before storing.
        # This ensures that database administrators cannot read the email content directly.
        encrypted_body = encrypt_message(email_data.body)
        
        new_email = models.InternalEmail(
            sender_id=sender_id,
            subject=email_data.subject,
            body=encrypted_body,
            priority=email_data.priority,
            is_encrypted=True
        )
        db.add(new_email)
        db.commit()
        db.refresh(new_email)
        
        # 2. Determine Recipients
        # Use a Set to avoid duplicate notifications if a user falls into multiple categories.
        recipient_ids = set(email_data.recipient_ids or [])
        
        # 2a. Handle Batch Broadcast
        # If a target batch is specified, fetch all Agniveers in that batch number.
        if email_data.target_batch:
            agniveers = db.query(models.Agniveer).filter(models.Agniveer.batch_no == email_data.target_batch).all()
            for ag in agniveers:
                if ag.user_account:
                    recipient_ids.add(ag.user_account.user_id)
                    
        # 2b. Handle Company Broadcast
        # If a target company is specified, fetch all Agniveers in that company.
        if email_data.target_company:
            agniveers = db.query(models.Agniveer).filter(models.Agniveer.company == email_data.target_company).all()
            for ag in agniveers:
                if ag.user_account:
                    recipient_ids.add(ag.user_account.user_id)
                    
        # 2c. Handle Role Routing (New)
        # Allows sending to all Commanding Officers (CO) or specific Company Commanders (COY_CDR).
        if email_data.target_role:
             # Case: Send to all Commanding Officers
             if email_data.target_role == 'co':
                 co_users = db.query(models.User).filter(models.User.role == models.UserRole.CO).all()
                 for u in co_users:
                     recipient_ids.add(u.user_id)
                     
             # Case: Send to the Company Commander of the Sender's company
             elif email_data.target_role == 'coy_cdr':
                 # Find Sender's Company via their Agniveer profile link
                 sender = db.query(models.User).filter(models.User.user_id == sender_id).first()
                 if sender and sender.agniveer_id:
                     agniveer = db.query(models.Agniveer).filter(models.Agniveer.id == sender.agniveer_id).first()
                     if agniveer and agniveer.company:
                         # Query for Users with COY_CDR role assigned to that company
                         cmdrs = db.query(models.User).filter(
                             models.User.role == models.UserRole.COY_CDR,
                             models.User.assigned_company == agniveer.company
                         ).all()
                         for u in cmdrs:
                             recipient_ids.add(u.user_id)
        
        # 3. Create Recipient Entries
        # Create an individual EmailRecipient record for each resolved user.
        # This allows per-user read/unread status and folder management.
        user_entries = []
        for rid in recipient_ids:
            # Allow self-send by not filtering out sender_id
            user_entries.append(models.EmailRecipient(
                email_id=new_email.id,
                recipient_id=rid,
                folder="inbox"
            ))
        
        if user_entries:
            db.add_all(user_entries)
            db.commit()
            
        # Return list of recipient IDs so we can send real-time notifications
        return [entry.recipient_id for entry in user_entries]

    @staticmethod
    def get_inbox(db: Session, user_id: int, skip: int = 0, limit: int = 20, search: str = None):
        # Join to get sender details
        # Query EmailRecipient where recipient_id == user_id
        query = (
            db.query(models.EmailRecipient, models.InternalEmail, models.User)
            .join(models.InternalEmail, models.EmailRecipient.email_id == models.InternalEmail.id)
            .join(models.User, models.InternalEmail.sender_id == models.User.user_id)
            .filter(models.EmailRecipient.recipient_id == user_id)
            .filter(models.EmailRecipient.folder == "inbox")
        )
        
        # Apply search filter if provided
        if search:
            search_term = f"%{search}%"
            # Filter matches if the search term is found in:
            # 1. Email Subject
            # 2. Sender's Full Name
            # 3. Sender's Username
            # Using ilike for case-insensitive matching (PostgreSQL/SQLite compatible)
            query = query.filter(
                (models.InternalEmail.subject.ilike(search_term)) |
                (models.User.full_name.ilike(search_term)) |
                (models.User.username.ilike(search_term))
            )
        
        results = (
            query
            .order_by(desc(models.InternalEmail.timestamp))
            .offset(skip)
            .limit(limit)
            .all()
        )
        
        inbox_items = []
        for rec, email, sender in results:
            inbox_items.append(schemas.InboxItem(
                id=rec.id, # Recipient Entry ID
                email_id=email.id,
                subject=email.subject,
                sender_id=email.sender_id,
                sender_name=sender.full_name or sender.username,
                sender_role=sender.role,
                timestamp=email.timestamp,
                is_read=rec.is_read,
                priority=email.priority,
                is_starred=rec.is_starred
            ))
        return inbox_items

    @staticmethod
    def get_email_detail(db: Session, recipient_entry_id: int, user_id: int):
        # Validate ownership
        entry = db.query(models.EmailRecipient).filter(
            models.EmailRecipient.id == recipient_entry_id,
            models.EmailRecipient.recipient_id == user_id
        ).first()
        
        if not entry:
            return None
            
        # Mark as read
        if not entry.is_read:
            entry.is_read = True
            entry.read_at = datetime.utcnow()
            db.commit()
            
        # Fetch content
        email = db.query(models.InternalEmail).filter(models.InternalEmail.id == entry.email_id).first()
        sender = db.query(models.User).filter(models.User.user_id == email.sender_id).first()
        
        # Decrypt body if encrypted
        body = decrypt_message(email.body) if email.is_encrypted else email.body
        
        return schemas.EmailDetail(
            id=entry.id,
            email_id=email.id,
            subject=email.subject,
            body=body,
            sender_id=email.sender_id,
            sender_name=sender.full_name or sender.username,
            sender_role=sender.role,
            timestamp=email.timestamp,
            is_read=entry.is_read,
            priority=email.priority
        )

    @staticmethod
    def get_unread_count(db: Session, user_id: int):
        return db.query(models.EmailRecipient).filter(
            models.EmailRecipient.recipient_id == user_id,
            models.EmailRecipient.is_read == False,
            models.EmailRecipient.folder == "inbox"
        ).count()

    @staticmethod
    def soft_delete_email(db: Session, recipient_entry_id: int, user_id: int):
        """Moves email to trash"""
        entry = db.query(models.EmailRecipient).filter(
            models.EmailRecipient.id == recipient_entry_id,
            models.EmailRecipient.recipient_id == user_id
        ).first()
        if entry:
            entry.folder = "trash"
            db.commit()
            return True
        
        # Fallback: Check if user is the Sender (deleting from Sent folder)
        # Note: In Sent folder, the ID passed is InternalEmail.id
        email = db.query(models.InternalEmail).filter(
            models.InternalEmail.id == recipient_entry_id,
            models.InternalEmail.sender_id == user_id
        ).first()
        
        if email:
            email.is_deleted_by_sender = True
            db.commit()
            return True
            
        return False

    @staticmethod
    def restore_email(db: Session, recipient_entry_id: int, user_id: int):
        """Moves email from trash to inbox"""
        entry = db.query(models.EmailRecipient).filter(
            models.EmailRecipient.id == recipient_entry_id,
            models.EmailRecipient.recipient_id == user_id
        ).first()
        if entry:
            entry.folder = "inbox"
            db.commit()
            return True
        return False
        
    @staticmethod
    def permanent_delete_email(db: Session, recipient_entry_id: int, user_id: int):
        """Permanently removes the recipient entry"""
        entry = db.query(models.EmailRecipient).filter(
            models.EmailRecipient.id == recipient_entry_id,
            models.EmailRecipient.recipient_id == user_id
        ).first()
        if entry:
            db.delete(entry)
            db.commit()
            return True
        return False

    @staticmethod
    def get_trash(db: Session, user_id: int, skip: int = 0, limit: int = 20):
        results = (
            db.query(models.EmailRecipient, models.InternalEmail, models.User)
            .join(models.InternalEmail, models.EmailRecipient.email_id == models.InternalEmail.id)
            .join(models.User, models.InternalEmail.sender_id == models.User.user_id)
            .filter(models.EmailRecipient.recipient_id == user_id)
            .filter(models.EmailRecipient.folder == "trash")
            .order_by(desc(models.InternalEmail.timestamp))
            .offset(skip)
            .limit(limit)
            .all()
        )
        items = []
        for rec, email, sender in results:
            items.append(schemas.InboxItem(
                id=rec.id,
                email_id=email.id,
                subject=email.subject,
                sender_id=email.sender_id,
                sender_name=sender.full_name or sender.username,
                sender_role=sender.role,
                timestamp=email.timestamp,
                is_read=rec.is_read,
                priority=email.priority
            ))
        return items

    @staticmethod
    def get_sent(db: Session, user_id: int, skip: int = 0, limit: int = 20):
        # For Sent items, we query InternalEmail where sender_id == user_id
        # Note: We don't have a 'Sent' folder per se, just all mails sent by user.
        # But we probably want to group them. 
        # Actually, `InternalEmail` is the source.
        # We need to know who it was sent TO. 
        # This is 1-to-Many. An email can have multiple recipients.
        # For the list view, we can just show "To: Multiple" or the first recipient.
        
        emails = (
            db.query(models.InternalEmail)
            .filter(models.InternalEmail.sender_id == user_id)
            .filter(models.InternalEmail.is_deleted_by_sender == False)
            .order_by(desc(models.InternalEmail.timestamp))
            .offset(skip)
            .limit(limit)
            .all()
        )
        
        sent_items = []
        for email in emails:
            # Fetch at least one recipient to show
            rec_count = db.query(models.EmailRecipient).filter(models.EmailRecipient.email_id == email.id).count()
            first_rec = db.query(models.EmailRecipient).filter(models.EmailRecipient.email_id == email.id).first()
            
            recipient_name = "Unknown"
            if first_rec:
                rec_user = db.query(models.User).filter(models.User.user_id == first_rec.recipient_id).first()
                if rec_user:
                    recipient_name = rec_user.full_name or rec_user.username
            
            if rec_count > 1:
                recipient_name += f" +{rec_count - 1} others"
                
            sent_items.append(schemas.InboxItem(
                id=email.id, # Using Email ID itself as the ref for Sent items
                email_id=email.id,
                subject=email.subject,
                sender_id=user_id, # Self
                sender_name=f"To: {recipient_name}", # Hack to reuse schema
                sender_role="You",
                timestamp=email.timestamp,
                is_read=True,
                priority=email.priority
            ))
        return sent_items

    @staticmethod
    def get_sent_message(db: Session, email_id: int, user_id: int):
        """Fetch a sent email by InternalEmail.id (checking sender_id)"""
        email = db.query(models.InternalEmail).filter(
            models.InternalEmail.id == email_id,
            models.InternalEmail.sender_id == user_id
        ).first()
        
        if not email:
            return None
            
        # We need to compute recipient string again for display?
        # Or just return the detail.
        # For simplicity, returning EmailDetail.
        
        # Decrypt body if encrypted
        body = decrypt_message(email.body) if email.is_encrypted else email.body
        
        return schemas.EmailDetail(
            id=email.id, # Using InternalID
            email_id=email.id,
            subject=email.subject,
            body=body,
            sender_id=email.sender_id,
            sender_name="You",
            sender_role="You",
            timestamp=email.timestamp,
            is_read=True,
            priority=email.priority
        )

    @staticmethod
    def get_mailbox_stats(db: Session, user_id: int):
        """Returns counts for Inbox (Unread), Sent (Total), Trash (Total)"""
        inbox_unread = db.query(models.EmailRecipient).filter(
            models.EmailRecipient.recipient_id == user_id,
            models.EmailRecipient.folder == "inbox",
            models.EmailRecipient.is_read == False
        ).count()
        
        inbox_total = db.query(models.EmailRecipient).filter(
           models.EmailRecipient.recipient_id == user_id,
           models.EmailRecipient.folder == "inbox"
        ).count()
        
        sent_total = db.query(models.InternalEmail).filter(
            models.InternalEmail.sender_id == user_id,
            models.InternalEmail.is_deleted_by_sender == False
        ).count()
        
        trash_total = db.query(models.EmailRecipient).filter(
            models.EmailRecipient.recipient_id == user_id,
            models.EmailRecipient.folder == "trash"
        ).count()
        
        return {
            "inbox_unread": inbox_unread,
            "inbox_total": inbox_total,
            "sent_total": sent_total,
            "trash_total": trash_total
        }

    @staticmethod
    def bulk_delete_emails(db: Session, ids: list[int], user_id: int, folder: str):
        """
        Bulk delete.
        If folder == 'trash', permanent delete.
        Else, soft delete (move to trash).
        """
        if folder == 'trash':
             db.query(models.EmailRecipient).filter(
                 models.EmailRecipient.recipient_id == user_id,
                 models.EmailRecipient.folder == 'trash',
                 models.EmailRecipient.id.in_(ids)
             ).delete(synchronize_session=False)
        elif folder == 'sent':
             # Soft delete for sender
             db.query(models.InternalEmail).filter(
                 models.InternalEmail.sender_id == user_id,
                 models.InternalEmail.id.in_(ids)
             ).update({models.InternalEmail.is_deleted_by_sender: True}, synchronize_session=False)
        else:
             db.query(models.EmailRecipient).filter(
                 models.EmailRecipient.recipient_id == user_id,
                 models.EmailRecipient.id.in_(ids)
             ).update({models.EmailRecipient.folder: "trash"}, synchronize_session=False)
             
        db.commit()
        return True

    # ============================================
    # PHASE 11: NEW METHODS
    # ============================================

    @staticmethod
    def toggle_star(db: Session, recipient_entry_id: int, user_id: int):
        """Toggle star status on a message"""
        entry = db.query(models.EmailRecipient).filter(
            models.EmailRecipient.id == recipient_entry_id,
            models.EmailRecipient.recipient_id == user_id
        ).first()
        if entry:
            entry.is_starred = not entry.is_starred
            db.commit()
            return entry.is_starred
        return None

    @staticmethod
    def get_drafts(db: Session, user_id: int):
        """Get all drafts for a user"""
        return db.query(models.EmailDraft).filter(
            models.EmailDraft.user_id == user_id
        ).order_by(desc(models.EmailDraft.updated_at)).all()

    @staticmethod
    def save_draft(db: Session, user_id: int, draft_data: dict):
        """Create or update a draft"""
        draft_id = draft_data.get('id')
        if draft_id:
            # Update existing
            draft = db.query(models.EmailDraft).filter(
                models.EmailDraft.id == draft_id,
                models.EmailDraft.user_id == user_id
            ).first()
            if draft:
                draft.subject = draft_data.get('subject', '')
                draft.body = draft_data.get('body', '')
                draft.recipient_ids_json = draft_data.get('recipient_ids_json', '[]')
                draft.target_type = draft_data.get('target_type', 'individual')
                draft.target_value = draft_data.get('target_value', '')
                db.commit()
                return draft
        
        # Create new
        new_draft = models.EmailDraft(
            user_id=user_id,
            subject=draft_data.get('subject', ''),
            body=draft_data.get('body', ''),
            recipient_ids_json=draft_data.get('recipient_ids_json', '[]'),
            target_type=draft_data.get('target_type', 'individual'),
            target_value=draft_data.get('target_value', '')
        )
        db.add(new_draft)
        db.commit()
        db.refresh(new_draft)
        return new_draft

    @staticmethod
    def delete_draft(db: Session, draft_id: int, user_id: int):
        """Delete a draft"""
        draft = db.query(models.EmailDraft).filter(
            models.EmailDraft.id == draft_id,
            models.EmailDraft.user_id == user_id
        ).first()
        if draft:
            db.delete(draft)
            db.commit()
            return True
        return False

    @staticmethod
    def forward_email(db: Session, email_id: int, user_id: int, new_recipient_ids: list):
        """Forward an existing email to new recipients"""
        # Get original email
        original = db.query(models.InternalEmail).filter(
            models.InternalEmail.id == email_id
        ).first()
        
        if not original:
            return 0
        
        # Create new email with forwarded content
        # Format the body to include original metadata (Sender, Date, Subject)
        # This mimics standard email client forwarding behavior.
        # The new sender is the current user (forwarder).
        forwarded = models.InternalEmail(
            sender_id=user_id,
            subject=f"Fwd: {original.subject}",
            body=f"---------- Forwarded message ----------\nFrom: User ID {original.sender_id}\nDate: {original.timestamp}\nSubject: {original.subject}\n\n{original.body}",
            priority=original.priority
        )
        db.add(forwarded)
        db.commit()
        db.refresh(forwarded)
        
        # Create recipient entries
        for rid in new_recipient_ids:
            db.add(models.EmailRecipient(
                email_id=forwarded.id,
                recipient_id=rid,
                folder="inbox"
            ))
        db.commit()
        return len(new_recipient_ids)

    @staticmethod
    def check_rate_limit(db: Session, user_id: int, action: str = "send_mail", limit: int = 10):
        """Check if user has exceeded rate limit (returns True if within limit)"""
        from datetime import timedelta
        one_hour_ago = datetime.utcnow() - timedelta(hours=1)
        
        count = db.query(models.RateLimitLog).filter(
            models.RateLimitLog.user_id == user_id,
            models.RateLimitLog.action == action,
            models.RateLimitLog.timestamp >= one_hour_ago
        ).count()
        
        return count < limit

    @staticmethod
    def log_rate_limit(db: Session, user_id: int, action: str = "send_mail"):
        """Log an action for rate limiting"""
        log = models.RateLimitLog(user_id=user_id, action=action)
        db.add(log)
        db.commit()

