"""Load and validate profile/profile.yaml."""

from pathlib import Path

import yaml
from pydantic import ValidationError

from .models import Profile

ROOT = Path(__file__).resolve().parent.parent
PROFILE_PATH = ROOT / "profile" / "profile.yaml"


def load_profile(path: Path = PROFILE_PATH) -> Profile:
    """Read the YAML profile. Fails loudly: a bad profile is not something to
    generate a resume from."""
    try:
        raw = yaml.safe_load(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        raise SystemExit(f"Profile not found: {path}")
    except yaml.YAMLError as error:
        raise SystemExit(f"Invalid YAML in {path}:\n{error}")

    try:
        return Profile.model_validate(raw)
    except ValidationError as error:
        raise SystemExit(f"Invalid profile {path}:\n{error}")
