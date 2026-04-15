# wefund/utils/supervisor.py
import subprocess

def run_supervisorctl(command):
    """
    Run a supervisorctl command and return output.
    Example: run_supervisorctl("status")
    """
    result = subprocess.run(
        ["sudo", "supervisorctl"] + command.split(),
        capture_output=True,
        text=True
    )
    return result.stdout.strip()


def get_status():
    return run_supervisorctl("status")


def start_process(name):
    return run_supervisorctl(f"start {name}")


def stop_process(name):
    return run_supervisorctl(f"stop {name}")


def restart_process(name):
    return run_supervisorctl(f"restart {name}")
