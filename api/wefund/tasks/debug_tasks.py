from celery import shared_task

@shared_task
def debug_ping():
    print("DEBUG TASK: Celery is working!")
    return "pong"
