from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from config.database import Base

class Appointment(Base):
    __tablename__ = "appointments"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    doctor_name = Column(String, nullable=False)
    hospital_name = Column(String, nullable=True)
    appointment_date = Column(DateTime, nullable=False)
    reason = Column(String, nullable=True)
    status = Column(String, default="scheduled")  # scheduled, completed, cancelled
    created_at = Column(DateTime, default=datetime.utcnow)
    
    document_id = Column(Integer, ForeignKey("documents.id", ondelete="CASCADE"), nullable=True)
    
    # Relationship to user
    owner = relationship("User", backref="appointments")
