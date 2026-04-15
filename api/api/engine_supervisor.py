from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from api.permissions import HasPermission
from api.utils.supervisor import get_status, start_process, stop_process, restart_process

from wefund.event_logger import log_event  # <-- import event logger


class SupervisorStatusView(APIView):
    """Get supervisor process status"""
    permission_classes = [HasPermission]
    required_permissions = ['system.manage_engine']

    def get(self, request):
        return Response({"status": get_status()})


class SupervisorControlView(APIView):
    """Control supervisor processes"""
    permission_classes = [HasPermission]
    required_permissions = ['system.manage_engine']

    def post(self, request, process_name, action):
        if action == "start":
            output = start_process(process_name)
            event_type = "engine_process_started"
            description = f"Admin ({request.user.email}) STARTED process '{process_name}'."

        elif action == "stop":
            output = stop_process(process_name)
            event_type = "engine_process_stopped"
            description = f"Admin ({request.user.email}) STOPPED process '{process_name}'."

        elif action == "restart":
            output = restart_process(process_name)
            event_type = "engine_process_restarted"
            description = f"Admin ({request.user.email}) RESTARTED process '{process_name}'."

        else:
            return Response({"error": "Invalid action"}, status=status.HTTP_400_BAD_REQUEST)

        # Log Process Control Action
        log_event(
            request=request,
            user=request.user,
            category="engine",
            event_type=event_type,
            metadata={
                "process_name": process_name,
                "action": action,
                "supervisor_output": str(output),
            },
            description=description,
        )

        return Response({
            "process": process_name,
            "action": action,
            "output": output
        })
