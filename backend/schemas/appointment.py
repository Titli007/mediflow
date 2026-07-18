from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class AppointmentBase(BaseModel):
    doctor_name: str
    hospital_name: Optional[str] = None
    appointment_date: datetime
    reason: Optional[str] = None
    status: Optional[str] = "scheduled"  # scheduled, completed, cancelled

class AppointmentCreate(AppointmentBase):
    pass

class AppointmentUpdate(BaseModel):
    doctor_name: Optional[str] = None
    hospital_name: Optional[str] = None
    appointment_date: Optional[datetime] = None
    reason: Optional[str] = None
    status: Optional[str] = None

class AppointmentResponse(AppointmentBase):
    id: int
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True
