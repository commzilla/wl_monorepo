from wefund.challenges.phase_handler import handle_transition

def run(enrollment):
    """
    Starts Phase 2 for 2-step challenges after Phase 1 is passed.
    """
    if enrollment.challenge.step_type != '2-step':
        return False

    if enrollment.status != 'phase_1_passed':
        return False

    # Move enrollment to Phase 2 In Progress
    from_status = enrollment.status
    to_status = 'phase_2_in_progress'
    phase_type = 'phase-2'

    handle_transition(enrollment, from_status, to_status, phase_type, reason="Starting Phase 2 for 2-step challenge")
    return True
