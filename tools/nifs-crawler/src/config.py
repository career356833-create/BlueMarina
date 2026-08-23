"""Configuration for NIFS crawler inspection."""
from pathlib import Path
from typing import Optional

PROJECT_ROOT = Path(__file__).parent.parent.parent.parent
DATA_DIR = PROJECT_ROOT / "data" / "nifs"
INSPECTION_DIR = DATA_DIR / "inspection"

# Directory structure
LIST_DIR = INSPECTION_DIR / "list"
DETAIL_DIR = INSPECTION_DIR / "detail"
NETWORK_DIR = INSPECTION_DIR / "network"
SCREENSHOT_DIR = INSPECTION_DIR / "screenshots"
RESPONSE_DIR = NETWORK_DIR / "responses"
LOGS_DIR = DATA_DIR / "logs"

# Ensure directories exist
for dir_path in [LIST_DIR, DETAIL_DIR, NETWORK_DIR, SCREENSHOT_DIR, RESPONSE_DIR, LOGS_DIR]:
    dir_path.mkdir(parents=True, exist_ok=True)

# Target site configuration
NIFS_BASE_URL = "https://nifs.go.kr"
NIFS_FISH_LIST_PATH = "/portal/fr/chrpA/actionChrpFishList.do"
NIFS_FISH_LIST_URL = NIFS_BASE_URL + NIFS_FISH_LIST_PATH

# Browser settings
HEADLESS = True
TIMEOUT_MS = 30000
WAIT_NETWORK_IDLE_MS = 5000

# Request limits for inspection
MAX_LIST_PAGES_TO_CHECK = 3
MAX_DETAIL_SAMPLES = 3
MAX_IMAGES_PER_DETAIL = 3

# User agent
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

# Logging
LOG_FILE = LOGS_DIR / "inspection.log"
LOG_FORMAT = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
