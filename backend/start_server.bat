@echo off
if exist venv\Scripts\python.exe (
    venv\Scripts\python.exe -m uvicorn main:app --reload --reload-dir config --reload-dir models --reload-dir routes --reload-dir schemas --reload-dir services --port 8000
) else if exist backend\venv\Scripts\python.exe (
    cd backend
    venv\Scripts\python.exe -m uvicorn main:app --reload --reload-dir config --reload-dir models --reload-dir routes --reload-dir schemas --reload-dir services --port 8000
) else (
    python -m uvicorn main:app --reload --reload-dir config --reload-dir models --reload-dir routes --reload-dir schemas --reload-dir services --port 8000
)
