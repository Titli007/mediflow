from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class BiometricLogBase(BaseModel):
    heart_rate: Optional[float] = None
    blood_glucose: Optional[float] = None
    cholesterol: Optional[float] = None
    date: Optional[datetime] = None

class BiometricLogCreate(BiometricLogBase):
    pass

class BiometricLogResponse(BiometricLogBase):
    id: int
    user_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True
