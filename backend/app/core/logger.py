import logging
import sys
from app.core.config import settings

def setup_logger() -> logging.Logger:
    logger = logging.getLogger("voicenexus")
    logger.setLevel(logging.DEBUG if settings.ENVIRONMENT == "development" else logging.INFO)

    handler = logging.StreamHandler(sys.stdout)
    formatter = logging.Formatter(
        "[%(asctime)s] [%(levelname)s] [%(name)s:%(lineno)d] - %(message)s"
    )
    handler.setFormatter(formatter)
    
    if not logger.handlers:
        logger.addHandler(handler)
        
    return logger

logger = setup_logger()
