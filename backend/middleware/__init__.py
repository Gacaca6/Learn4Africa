"""Learn4Africa — custom Starlette middleware."""

from .logging import RequestIDMiddleware

__all__ = ["RequestIDMiddleware"]
