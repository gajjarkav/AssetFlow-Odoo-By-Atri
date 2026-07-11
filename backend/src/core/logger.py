from __future__ import annotations

import logging
import sys
from src.core.config import get_settings

# Default logging format
LOG_FORMAT = "%(asctime)s - %(levelname)s - %(name)s - %(message)s"

def get_logger(name: str) -> logging.Logger:
    """
    Get a pre-configured logger instance.
    """
    logger = logging.getLogger(name)
    
    # Configure the logger only if handlers are not already set
    if not logger.handlers:
        settings = get_settings()
        level = logging.DEBUG if settings.DEBUG else logging.INFO
        logger.setLevel(level)
        
        # Stream Handler for stdout
        handler = logging.StreamHandler(sys.stdout)
        formatter = logging.Formatter(LOG_FORMAT)
        handler.setFormatter(formatter)
        logger.addHandler(handler)
        
        # Prevent log messages from duplicating in uvicorn's root handler
        logger.propagate = False
        
    return logger

# Application-wide logger
logger = get_logger("assetflow")
