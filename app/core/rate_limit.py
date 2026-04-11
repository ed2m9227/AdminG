from collections import defaultdict, deque
from threading import Lock
import time


_BUCKETS: dict[str, deque[float]] = defaultdict(deque)
_LOCK = Lock()


def allow_request(bucket_key: str, max_requests: int, window_seconds: int) -> tuple[bool, int]:
    """Return (allowed, retry_after_seconds) for a fixed-window sliding bucket."""
    now = time.time()
    window_start = now - window_seconds

    with _LOCK:
        bucket = _BUCKETS[bucket_key]
        while bucket and bucket[0] < window_start:
            bucket.popleft()

        if len(bucket) >= max_requests:
            retry_after = int(max(1, window_seconds - (now - bucket[0])))
            return False, retry_after

        bucket.append(now)
        return True, 0
