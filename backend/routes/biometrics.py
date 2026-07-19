from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from config.database import get_db
from models.user import User
from models.biometric import BiometricLog
from schemas.biometric import BiometricLogCreate, BiometricLogResponse
from routes.auth import get_current_user
from datetime import datetime
from typing import List

router = APIRouter(prefix="/api/biometrics", tags=["biometrics"])

@router.post("/", response_model=BiometricLogResponse)
def create_biometric_log(
    log_in: BiometricLogCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Ensure at least one biometric value is provided
    if log_in.heart_rate is None and log_in.blood_glucose is None and log_in.cholesterol is None:
        raise HTTPException(
            status_code=400, 
            detail="At least one biometric reading (heart rate, blood glucose, or cholesterol) must be provided."
        )

    db_log = BiometricLog(
        user_id=current_user.id,
        date=log_in.date or datetime.utcnow(),
        heart_rate=log_in.heart_rate,
        blood_glucose=log_in.blood_glucose,
        cholesterol=log_in.cholesterol
    )
    db.add(db_log)
    db.commit()
    db.refresh(db_log)
    return db_log

@router.get("/", response_model=List[BiometricLogResponse])
def get_biometric_logs(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return db.query(BiometricLog).filter(
        BiometricLog.user_id == current_user.id
    ).order_by(BiometricLog.date.desc()).all()
