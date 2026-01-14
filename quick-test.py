#!/usr/bin/env python3
"""Quick API test after IPC fix"""
import json
import asyncio
import websockets

async def quick_test():
    ws_url = "ws://localhost:9222/devtools/page/463EC43F842D7F56CFB2F64341A5AE48"

    async with websockets.connect(ws_url, max_size=10 * 1024 * 1024) as ws:
        # Enable Runtime
        await ws.send(json.dumps({"id": 1, "method": "Runtime.enable"}))
        await ws.recv()

        # Test planning API
        await ws.send(json.dumps({
            "id": 2,
            "method": "Runtime.evaluate",
            "params": {
                "expression": "typeof window.electronAPI.planning.startIntake === 'function'",
                "returnByValue": True
            }
        }))

        # Wait for responses
        for _ in range(5):
            response = await ws.recv()
            msg = json.loads(response)
            if "id" in msg and msg["id"] == 2:
                if "result" in msg and "result" in msg["result"]:
                    has_method = msg["result"]["result"]["value"]
                    print(f"✓ planning.startIntake exists: {has_method}")
                break

        # Test calling the API
        await ws.send(json.dumps({
            "id": 3,
            "method": "Runtime.evaluate",
            "params": {
                "expression": """
                    (async () => {
                        try {
                            const result = await window.electronAPI.planning.startIntake();
                            return { success: true, hasSessionId: !!result.sessionId };
                        } catch (error) {
                            return { success: false, error: error.message };
                        }
                    })()
                """,
                "awaitPromise": True,
                "returnByValue": True
            }
        }))

        # Wait for call result
        for _ in range(10):
            response = await ws.recv()
            msg = json.loads(response)
            if "id" in msg and msg["id"] == 3:
                if "result" in msg and "result" in msg["result"]:
                    result = msg["result"]["result"]["value"]
                    print(f"✓ API call result: {json.dumps(result, indent=2)}")
                break

        print("\n✅ Quick test complete!")

asyncio.run(quick_test())
