import logging

# Simple, clean logging format that works with all systems
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
)

def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(name)
