from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class ReminderBase(BaseModel):
    reminder_type: str = Field(..., description="medicine, appointment, general")
    title: str
    reminder_time: str = Field(..., description="e.g. '08:00' or ISO time")
    frequency: Optional[str] = "daily"  # daily, weekly, once
    is_active: Optional[bool] = True
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    doses_taken_today: Optional[int] = 0
    last_taken_date: Optional[datetime] = None
    dosage: Optional[str] = None
    notes: Optional[str] = None
    document_id: Optional[int] = None

class ReminderCreate(ReminderBase):
    pass

class ReminderUpdate(BaseModel):
    reminder_type: Optional[str] = None
    title: Optional[str] = None
    reminder_time: Optional[str] = None
    frequency: Optional[str] = None
    is_active: Optional[bool] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    doses_taken_today: Optional[int] = None
    last_taken_date: Optional[datetime] = None
    dosage: Optional[str] = None
    notes: Optional[str] = None
    document_id: Optional[int] = None

class ReminderResponse(ReminderBase):
    id: int
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True
