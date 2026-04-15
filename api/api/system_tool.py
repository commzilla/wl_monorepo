# system_tool.py
import os
import subprocess
from rest_framework.views import APIView
from rest_framework.response import Response

def _read_git_commit():
    try:
        return subprocess.check_output(
            ["git", "rev-parse", "HEAD"],
            stderr=subprocess.DEVNULL
        ).decode().strip()
    except Exception:
        return None

# Resolve ONCE at startup
GIT_COMMIT = (
    os.getenv("GIT_COMMIT")
    or _read_git_commit()
    or "unknown"
)

class SystemVersionView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        return Response({
            "commit": GIT_COMMIT,
            "service": "backend",
        })
