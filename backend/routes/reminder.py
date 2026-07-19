from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from config.database import get_db
from models.reminder import Reminder
from models.user import User
from schemas.reminder import ReminderCreate, ReminderUpdate, ReminderResponse
from routes.auth import get_current_user
from typing import List

router = APIRouter(prefix="/api/reminders", tags=["reminders"])

@router.post("/", response_model=ReminderResponse, status_code=status.HTTP_201_CREATED)
def create_reminder(
    reminder_in: ReminderCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db_reminder = Reminder(
        user_id=current_user.id,
        reminder_type=reminder_in.reminder_type,
        title=reminder_in.title,
        reminder_time=reminder_in.reminder_time,
        frequency=reminder_in.frequency,
        is_active=reminder_in.is_active,
        start_date=reminder_in.start_date,
        end_date=reminder_in.end_date,
        doses_taken_today=reminder_in.doses_taken_today,
        last_taken_date=reminder_in.last_taken_date
    )
    db.add(db_reminder)
    db.commit()
    db.refresh(db_reminder)
    return db_reminder

@router.get("/", response_model=List[ReminderResponse])
def list_reminders(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    reminders = db.query(Reminder).filter(Reminder.user_id == current_user.id).order_by(Reminder.reminder_time.asc()).all()
    
    from datetime import datetime
    today = datetime.utcnow().date()
    updated = False
    
    for r in reminders:
        # Check if we need to reset the daily dose tracker (new day)
        if r.last_taken_date and r.last_taken_date.date() < today:
            r.doses_taken_today = 0
            updated = True
            
        # Auto-expire/end reminder if it has an end_date and the end_date has passed
        if r.is_active and r.end_date and r.end_date.date() < today:
            r.is_active = False
            updated = True
            
    if updated:
        db.commit()
        # Fetch fresh data
        reminders = db.query(Reminder).filter(Reminder.user_id == current_user.id).order_by(Reminder.reminder_time.asc()).all()
        
    return reminders

@router.get("/{reminder_id}", response_model=ReminderResponse)
def get_reminder(
    reminder_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    reminder = db.query(Reminder).filter(Reminder.id == reminder_id, Reminder.user_id == current_user.id).first()
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")
    return reminder

@router.post("/{reminder_id}/log-dose", response_model=ReminderResponse)
def log_dose(
    reminder_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    reminder = db.query(Reminder).filter(Reminder.id == reminder_id, Reminder.user_id == current_user.id).first()
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")
        
    from datetime import datetime
    reminder.doses_taken_today = (reminder.doses_taken_today or 0) + 1
    reminder.last_taken_date = datetime.utcnow()
    db.commit()
    db.refresh(reminder)
    return reminder

@router.post("/{reminder_id}/reset-dose", response_model=ReminderResponse)
def reset_dose(
    reminder_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    reminder = db.query(Reminder).filter(Reminder.id == reminder_id, Reminder.user_id == current_user.id).first()
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")
        
    from datetime import datetime
    reminder.doses_taken_today = max(0, (reminder.doses_taken_today or 0) - 1)
    reminder.last_taken_date = datetime.utcnow()
    db.commit()
    db.refresh(reminder)
    return reminder

@router.put("/{reminder_id}", response_model=ReminderResponse)
def update_reminder(
    reminder_id: int,
    reminder_in: ReminderUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    reminder = db.query(Reminder).filter(Reminder.id == reminder_id, Reminder.user_id == current_user.id).first()
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")
        
    update_data = reminder_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(reminder, field, value)
        
    db.commit()
    db.refresh(reminder)
    return reminder

@router.delete("/{reminder_id}")
def delete_reminder(
    reminder_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    reminder = db.query(Reminder).filter(Reminder.id == reminder_id, Reminder.user_id == current_user.id).first()
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")
        
    db.delete(reminder)
    db.commit()
    return {"message": "Reminder deleted successfully"}
