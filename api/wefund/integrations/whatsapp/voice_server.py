"""
FastAPI WebSocket server for Twilio ConversationRelay voice calls.

Runs on port 8091, managed by Supervisor.
Bootstraps Django ORM at startup for product data and event logging.
"""
import json
import logging
import os
import sys
import time

# Bootstrap Django before any Django imports
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backend.settings")

# Add the Django project to sys.path so imports work
_src_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
if _src_dir not in sys.path:
    sys.path.insert(0, _src_dir)

import django
django.setup()

from asgiref.sync import sync_to_async
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse

from wefund.integrations.whatsapp.voice_agent import VoiceAgent
from wefund.event_logger import log_engine_event

logger = logging.getLogger("voice_server")
logger.setLevel(logging.INFO)

app = FastAPI(title="WeFund Voice Server", docs_url=None, redoc_url=None)

# Wrap synchronous Django ORM calls for use in async context
_log_event = sync_to_async(log_engine_event, thread_sensitive=True)
_create_agent = sync_to_async(VoiceAgent, thread_sensitive=True)


@sync_to_async(thread_sensitive=True)
def _process_message(agent, text):
    return agent.process_message(text)


@app.get("/ws/health")
async def health_check():
    return JSONResponse({"status": "ok", "service": "voice-server"})


@app.websocket("/ws/voice/")
async def voice_websocket(websocket: WebSocket):
    """
    Handle Twilio ConversationRelay WebSocket connections.

    Protocol messages from Twilio:
    - setup: initial connection with call metadata
    - prompt: transcribed speech from the caller (voicePrompt field)
    - interrupt: caller interrupted the AI response
    - dtmf: caller pressed a phone key
    - disconnect (or WS close): call ended
    """
    await websocket.accept()

    agent = None
    call_sid = None
    caller = None
    start_time = time.time()

    try:
        async for raw_message in websocket.iter_text():
            try:
                data = json.loads(raw_message)
            except json.JSONDecodeError:
                logger.warning("Invalid JSON received: %s", raw_message[:200])
                continue

            msg_type = data.get("type", "")

            if msg_type == "setup":
                call_sid = data.get("callSid", "unknown")
                caller = data.get("from", "unknown")
                logger.info("Voice call setup | callSid=%s from=%s", call_sid, caller)

                agent = await _create_agent(call_sid=call_sid, caller=caller)
                greeting = agent.get_greeting()

                await websocket.send_text(json.dumps({
                    "type": "text",
                    "token": greeting,
                    "last": True,
                }))

                try:
                    await _log_event(
                        event_type="whatsapp_voice_call",
                        engine="voice_agent",
                        description=f"Voice call started from {caller}",
                        metadata={"call_sid": call_sid, "caller": caller},
                    )
                except Exception:
                    logger.exception("Failed to log call start event")

            elif msg_type == "prompt":
                voice_prompt = data.get("voicePrompt", "").strip()
                if not voice_prompt or agent is None:
                    continue

                logger.info("Voice prompt | callSid=%s text=%s", call_sid, voice_prompt[:100])

                result = await _process_message(agent, voice_prompt)

                await websocket.send_text(json.dumps({
                    "type": "text",
                    "token": result["text"],
                    "last": True,
                }))

                # Log tool calls
                for tc in result.get("tool_calls", []):
                    try:
                        await _log_event(
                            event_type="whatsapp_voice_call",
                            engine="voice_agent",
                            description=f"Voice tool call: {tc['name']}",
                            metadata={
                                "call_sid": call_sid,
                                "tool_name": tc["name"],
                                "tool_input": tc["input"],
                            },
                        )
                    except Exception:
                        logger.exception("Failed to log tool call event")

                if result.get("handoff"):
                    logger.info("Handoff requested | callSid=%s", call_sid)
                    # End the conversation after handoff message is delivered
                    await websocket.send_text(json.dumps({
                        "type": "end",
                        "handoff": True,
                    }))

            elif msg_type == "interrupt":
                logger.debug("Caller interrupted | callSid=%s", call_sid)

            elif msg_type == "dtmf":
                digit = data.get("digit", "")
                logger.info("DTMF digit | callSid=%s digit=%s", call_sid, digit)

            elif msg_type == "disconnect":
                logger.info("Disconnect message | callSid=%s", call_sid)
                break

    except WebSocketDisconnect:
        logger.info("WebSocket disconnected | callSid=%s", call_sid)
    except Exception:
        logger.exception("Voice WebSocket error | callSid=%s", call_sid)
    finally:
        duration = int(time.time() - start_time)
        tool_count = len(agent.tool_calls) if agent else 0
        logger.info(
            "Voice call ended | callSid=%s duration=%ds tools=%d handoff=%s",
            call_sid, duration, tool_count,
            agent.handoff_requested if agent else False,
        )
        try:
            await _log_event(
                event_type="whatsapp_voice_call",
                engine="voice_agent",
                description=f"Voice call ended after {duration}s",
                metadata={
                    "call_sid": call_sid or "unknown",
                    "caller": caller or "unknown",
                    "duration_seconds": duration,
                    "tool_calls_count": tool_count,
                    "handoff_requested": agent.handoff_requested if agent else False,
                    "tool_calls": agent.tool_calls if agent else [],
                },
            )
        except Exception:
            logger.exception("Failed to log call end event")
