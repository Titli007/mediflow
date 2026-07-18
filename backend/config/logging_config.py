import logging
import sys
import os
from datetime import datetime

# Configure logging
LOG_FORMAT = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
DATE_FORMAT = "%Y-%m-%d %H:%M:%S"

# Fix Windows console encoding to UTF-8
if sys.platform == 'win32':
    # Enable UTF-8 mode on Windows
    os.environ['PYTHONIOENCODING'] = 'utf-8'
    
    # Try to set console to UTF-8
    try:
        import ctypes
        kernel32 = ctypes.windll.kernel32
        kernel32.SetConsoleCP(65001)  # 65001 is UTF-8 code page
        kernel32.SetConsoleOutputCP(65001)
    except Exception:
        pass  # If it fails, continue anyway

    # Reconfigure stdout/stderr to UTF-8
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

# Create logger
logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

# Console handler
console_handler = logging.StreamHandler(sys.stdout)
console_handler.setLevel(logging.DEBUG)
console_formatter = logging.Formatter(LOG_FORMAT, datefmt=DATE_FORMAT)
console_handler.setFormatter(console_formatter)

# File handler with UTF-8 encoding
file_handler = logging.FileHandler("medical_extraction.log", encoding='utf-8')
file_handler.setLevel(logging.DEBUG)
file_formatter = logging.Formatter(LOG_FORMAT, datefmt=DATE_FORMAT)
file_handler.setFormatter(file_formatter)

# Add handlers
logger.addHandler(console_handler)
logger.addHandler(file_handler)

def get_logger(name):
    """Get logger for a specific module"""
    module_logger = logging.getLogger(name)
    module_logger.setLevel(logging.DEBUG)
    module_logger.addHandler(console_handler)
    module_logger.addHandler(file_handler)
    return module_logger
