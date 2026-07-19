from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from config.database import get_db
from models.appointment import Appointment
from models.user import User
from schemas.appointment import AppointmentCreate, AppointmentUpdate, AppointmentResponse
from routes.auth import get_current_user
from typing import List

router = APIRouter(prefix="/api/appointments", tags=["appointments"])

from datetime import timedelta

@router.post("/", response_model=AppointmentResponse, status_code=status.HTTP_201_CREATED)
def create_appointment(
    appointment_in: AppointmentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Enforce 2-hour slot buffers to prevent doctor double-booking
    requested_time = appointment_in.appointment_date
    start_bound = requested_time - timedelta(hours=2)
    end_bound = requested_time + timedelta(hours=2)

    overlapping = db.query(Appointment).filter(
        Appointment.doctor_name == appointment_in.doctor_name,
        Appointment.appointment_date > start_bound,
        Appointment.appointment_date < end_bound,
        Appointment.status != "cancelled"
    ).first()

    if overlapping:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{appointment_in.doctor_name} already has an appointment scheduled at {overlapping.appointment_date.strftime('%H:%M')} (requires a 1-hour buffer)."
        )

    db_appointment = Appointment(
        user_id=current_user.id,
        doctor_name=appointment_in.doctor_name,
        hospital_name=appointment_in.hospital_name,
        appointment_date=appointment_in.appointment_date,
        reason=appointment_in.reason,
        status=appointment_in.status
    )
    db.add(db_appointment)
    db.commit()
    db.refresh(db_appointment)
    return db_appointment

@router.get("/", response_model=List[AppointmentResponse])
def list_appointments(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return db.query(Appointment).filter(Appointment.user_id == current_user.id).order_by(Appointment.appointment_date.asc()).all()

@router.get("/{appointment_id}", response_model=AppointmentResponse)
def get_appointment(
    appointment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id, Appointment.user_id == current_user.id).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    return appointment

@router.put("/{appointment_id}", response_model=AppointmentResponse)
def update_appointment(
    appointment_id: int,
    appointment_in: AppointmentUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id, Appointment.user_id == current_user.id).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
        
    update_data = appointment_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(appointment, field, value)
        
    db.commit()
    db.refresh(appointment)
    return appointment

@router.delete("/{appointment_id}")
def delete_appointment(
    appointment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id, Appointment.user_id == current_user.id).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
        
    db.delete(appointment)
    db.commit()
    return {"message": "Appointment deleted successfully"}
