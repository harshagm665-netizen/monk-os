import serial
import time
import threading
import queue
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import logging

router = APIRouter()

# --- Hardware Configuration ---
# You may need to change 'COM8' to whatever your Arduino Mega is registering as on your Windows/Pi
ARDUINO_PORT = 'COM8'  # On Linux/Pi, this is usually '/dev/ttyACM0' or '/dev/ttyUSB0'
BAUD_RATE = 9600

class RobotBridge:
    def __init__(self):
        self.serial_conn = None
        self.lock = threading.Lock()
        self.connected = False
        self.command_queue = queue.Queue(maxsize=50) # Prevent memory explosion if spammed
        
        self.connect()
        
        # Start the persistent background worker thread that drains the queue safely
        self.worker_thread = threading.Thread(target=self._process_queue, daemon=True)
        self.worker_thread.start()

    def connect(self):
        try:
            self.serial_conn = serial.Serial(ARDUINO_PORT, BAUD_RATE, timeout=1)
            time.sleep(2)  # Wait for Arduino to reset upon serial connection
            self.connected = True
            logging.info(f"[Hardware Bridge] Successfully connected to Arduino on {ARDUINO_PORT}")
        except Exception as e:
            self.connected = False
            logging.error(f"[Hardware Bridge] Failed to connect to Arduino: {e}")

    def enqueue_command(self, cmd: str):
        """Public method to push a command into the safe execution queue."""
        cmd = cmd.strip().lower()
        
        # EMERGENCY STOP PROTOCOL
        if cmd == "s" or cmd == "dance stop":
            with self.lock:
                # Flush the entire queue instantly so we don't finish pending moves
                self.command_queue.queue.clear()
            # Push stop to the very front so it executes immediately next
            logging.warning("[Hardware Bridge] EMERGENCY FLUSH! Stop command jump to front of queue.")
            self._send_command_immediate(cmd)
            return

        try:
            self.command_queue.put_nowait(cmd)
        except queue.Full:
            logging.error("[Hardware Bridge] WARNING: Hardware Command Queue is FULL. Dropping command.")

    def _process_queue(self):
        """Background daemon thread that pops commands one by one to prevent buffer overruns."""
        while True:
            cmd = self.command_queue.get() # Blocks until a command is available
            try:
                self._send_command_immediate(cmd)
            except Exception as e:
                logging.error(f"[Hardware Bridge] Queue execution failed: {e}")
            finally:
                self.command_queue.task_done()
                
    def _send_command_immediate(self, cmd: str):
        if not self.connected or not self.serial_conn:
            self.connect()
            if not self.connected:
                logging.error("Arduino is disconnected. Dropping command.")
                return
        
        with self.lock:
            try:
                # The Arduino code expects commands ending in '\n'
                command_str = f"{cmd}\n"
                self.serial_conn.write(command_str.encode('utf-8'))
                
                # WAIT STATE: Let the Arduino physically move its servos before we allow the next command 
                # This prevents "Ghost Movement" buffer overruns.
                timeout_start = time.time()
                while time.time() < timeout_start + 2.0: # Max wait 2 seconds per command
                    if self.serial_conn.in_waiting > 0:
                        response = self.serial_conn.readline().decode('utf-8').strip()
                        logging.info(f"[Hardware Bridge] Arduino replied: {response}")
                        break
                    time.sleep(0.05)
                
            except Exception as e:
                self.connected = False
                logging.error(f"Serial Write Failed: {e}")

# Global persistent instance
robot = RobotBridge()

class CommandPayload(BaseModel):
    command: str

@router.get("/status")
def get_status():
    """Checks if the internal PySerial connection is active."""
    return {"connected": robot.connected, "port": ARDUINO_PORT}

@router.post("/execute")
def execute_hardware_command(payload: CommandPayload):
    """
    Available Commands mapping directly to Arduino C++ checkStop():
    - "dance start" (Enter infinite dance loop)
    - "dance stop" or "s" (Stop dance and reset to center)
    - "bf", "bb", "bl", "br" (Base: Forward, Backward, Left, Right)
    - "hf", "hb" (Hands: Forward, Backward)
    - "xf", "xb" (Head: Forward, Backward)
    """
    valid_commands = ["dance start", "dance stop", "s", "bf", "bb", "bl", "br", "hf", "hb", "xf", "xb"]
    
    if payload.command.lower() not in valid_commands:
        raise HTTPException(status_code=400, detail="Unknown hardware command")

    try:
        # Instead of slamming the hardware instantly, we push to the safe queue
        robot.enqueue_command(payload.command)
        return {"status": "success (queued)", "command_queued": payload.command}
    except Exception as e:
        raise HTTPException(status_code=503, detail=str(e))
