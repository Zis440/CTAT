import shutil
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy.sql import func

from app.database import get_db, SUPPORT_DIR
from app.models.user import User, UserRole
from app.models.support import SupportTicket, SupportMessage, TicketStatus
from app.schemas.support import SupportTicketCreate, SupportTicketOut, SupportTicketAdminOut, SupportMessageOut
from app.auth.dependencies import get_current_user, require_super_admin, require_admin_or_above

router = APIRouter(prefix="/api/support", tags=["support"])

@router.post("", response_model=SupportTicketOut, status_code=201)
def create_ticket(
    req: SupportTicketCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Submit a new support ticket."""
    ticket = SupportTicket(
        user_id=current_user.id,
        subject=req.subject,
        message=req.message,
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)
    return ticket

@router.get("", response_model=List[SupportTicketOut])
def get_tickets(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve all support tickets for the authenticated user."""
    tickets = (
        db.query(SupportTicket)
        .filter(SupportTicket.user_id == current_user.id)
        .order_by(SupportTicket.created_at.desc())
        .all()
    )
    return tickets

@router.get("/admin-all", response_model=List[SupportTicketAdminOut])
def get_all_tickets_admin(
    current_user: User = Depends(require_super_admin),
    db: Session = Depends(get_db),
):
    """Retrieve all support tickets for super admin review."""
    results = (
        db.query(SupportTicket, User)
        .join(User, SupportTicket.user_id == User.id)
        .order_by(SupportTicket.created_at.desc())
        .all()
    )
    tickets = []
    for ticket, user in results:
        t = SupportTicketAdminOut(
            id=ticket.id,
            user_id=ticket.user_id,
            subject=ticket.subject,
            message=ticket.message,
            status=ticket.status,
            created_at=ticket.created_at,
            updated_at=ticket.updated_at,
            user_email=user.email,
            user_name=f"{user.first_name} {user.last_name or ''}".strip(),
        )
        tickets.append(t)
    return tickets

@router.get("/clinic-staff", response_model=List[SupportTicketAdminOut])
def get_clinic_staff_tickets(
    current_user: User = Depends(require_admin_or_above),
    db: Session = Depends(get_db),
):
    """Retrieve all support tickets from staff within the current clinic admin's clinic."""
    if not current_user.clinic_id:
        return []
        
    results = (
        db.query(SupportTicket, User)
        .join(User, SupportTicket.user_id == User.id)
        .filter(User.clinic_id == current_user.clinic_id)
        .filter(User.id != current_user.id)
        .order_by(SupportTicket.created_at.desc())
        .all()
    )
    tickets = []
    for ticket, user in results:
        t = SupportTicketAdminOut(
            id=ticket.id,
            user_id=ticket.user_id,
            subject=ticket.subject,
            message=ticket.message,
            status=ticket.status,
            created_at=ticket.created_at,
            updated_at=ticket.updated_at,
            user_email=user.email,
            user_name=f"{user.first_name} {user.last_name or ''}".strip(),
        )
        tickets.append(t)
    return tickets

@router.patch("/{ticket_id}/status", response_model=SupportTicketOut)
def update_ticket_status(
    ticket_id: str,
    status: str,
    current_user: User = Depends(require_super_admin),
    db: Session = Depends(get_db),
):
    """Update ticket status (e.g. open/closed)."""
    ticket = db.query(SupportTicket).filter(SupportTicket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    if status not in [s.value for s in TicketStatus]:
        raise HTTPException(status_code=400, detail="Invalid status")
    ticket.status = TicketStatus(status)
    db.commit()
    db.refresh(ticket)
    return ticket
@router.get("/{ticket_id}/messages", response_model=List[SupportMessageOut])
def get_ticket_messages(
    ticket_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all messages for a specific ticket."""
    ticket = db.query(SupportTicket).filter(SupportTicket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
        
    # Owner and super admin can view
    can_view = (ticket.user_id == current_user.id or current_user.role == UserRole.super_admin)
    
    # Clinic admin can view their staff's tickets
    if not can_view and current_user.role == UserRole.clinic_admin:
        ticket_owner = db.query(User).filter(User.id == ticket.user_id).first()
        if ticket_owner and ticket_owner.clinic_id == current_user.clinic_id:
            can_view = True
            
    if not can_view:
        raise HTTPException(status_code=403, detail="Not authorized to view these messages")

    results = (
        db.query(SupportMessage, User)
        .join(User, SupportMessage.sender_id == User.id)
        .filter(SupportMessage.ticket_id == ticket_id)
        .order_by(SupportMessage.created_at.asc())
        .all()
    )
    
    messages = []
    for msg, user in results:
        m = SupportMessageOut(
            id=msg.id,
            ticket_id=msg.ticket_id,
            sender_id=msg.sender_id,
            sender_name=f"{user.first_name} {user.last_name or ''}".strip(),
            sender_role=user.role.value,
            message=msg.message,
            attachment_path=msg.attachment_path,
            created_at=msg.created_at,
        )
        messages.append(m)
    return messages


@router.post("/{ticket_id}/messages", response_model=SupportMessageOut, status_code=201)
def reply_to_ticket(
    ticket_id: str,
    message: str = Form(...),
    file: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Add a new message/reply to a ticket."""
    ticket = db.query(SupportTicket).filter(SupportTicket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
        
    # Owner and super admin can reply
    can_reply = (ticket.user_id == current_user.id or current_user.role == UserRole.super_admin)
    
    # Clinic admin can reply to their staff's tickets
    if not can_reply and current_user.role == UserRole.clinic_admin:
        ticket_owner = db.query(User).filter(User.id == ticket.user_id).first()
        if ticket_owner and ticket_owner.clinic_id == current_user.clinic_id:
            can_reply = True

    if not can_reply:
        raise HTTPException(status_code=403, detail="Not authorized to reply to this ticket")

    if ticket.status == TicketStatus.closed:
        raise HTTPException(status_code=400, detail="Cannot reply to a closed ticket")

    # Handle optional file upload
    attachment_path = None
    if file:
        allowed_types = {"image/jpeg", "image/png", "image/jpg", "application/pdf"}
        if file.content_type not in allowed_types:
            raise HTTPException(status_code=415, detail=f"File type '{file.content_type}' not allowed.")
            
        # UPLOADS_DIR import removed; SUPPORT_DIR used directly
        support_uploads_dir = SUPPORT_DIR / ticket_id
        support_uploads_dir.mkdir(parents=True, exist_ok=True)
        
        safe_name = Path(file.filename).name
        dest = support_uploads_dir / safe_name

        contents = file.file.read()
        if len(contents) > 5 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="File exceeds the 5MB size limit.")

        with dest.open("wb") as f:
            f.write(contents)
        attachment_path = f"uploads/support/{ticket_id}/{safe_name}"

    support_message = SupportMessage(
        ticket_id=ticket_id,
        sender_id=current_user.id,
        message=message,
        attachment_path=attachment_path,
    )
    db.add(support_message)
    
    # Update ticket updated_at
    ticket.updated_at = func.now()
    
    db.commit()
    db.refresh(support_message)
    
    return SupportMessageOut(
        id=support_message.id,
        ticket_id=support_message.ticket_id,
        sender_id=support_message.sender_id,
        sender_name=f"{current_user.first_name} {current_user.last_name or ''}".strip(),
        sender_role=current_user.role.value,
        message=support_message.message,
        attachment_path=support_message.attachment_path,
        created_at=support_message.created_at,
    )
