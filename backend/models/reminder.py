from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from config.database import Base

class Reminder(Base):
    __tablename__ = "reminders"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    reminder_type = Column(String, nullable=False)  # medicine, appointment, general
    title = Column(String, nullable=False)  # e.g., "Calpol 650mg"
    reminder_time = Column(String, nullable=False)  # e.g., "08:00" or ISO time string
    frequency = Column(String, default="daily")  # daily, weekly, once
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationship to user
    owner = relationship("User", backref="reminders")
