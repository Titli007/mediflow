from sqlalchemy import Column, Integer, Float, DateTime, ForeignKey
from datetime import datetime
from config.database import Base

class BiometricLog(Base):
    __tablename__ = "biometric_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    date = Column(DateTime, default=datetime.utcnow, nullable=False)
    heart_rate = Column(Float, nullable=True)
    blood_glucose = Column(Float, nullable=True)
    cholesterol = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
