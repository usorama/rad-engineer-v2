#!/usr/bin/env python3
"""Quick diagnostic to see what's actually in window.electronAPI"""
import json
import asyncio
import websockets

async def check_api_structure():
    ws_url = "ws://localhost:9222/devtools/page/463EC43F842D7F56CFB2F64341A5AE48"

    async with websockets.connect(ws_url, max_size=10 * 1024 * 1024) as ws:
        # Enable Runtime
        await ws.send(json.dumps({"id": 1, "method": "Runtime.enable"}))
        await ws.recv()

        # Get window.electronAPI structure
        await ws.send(json.dumps({
            "id": 2,
            "method": "Runtime.evaluate",
            "params": {
                "expression": """
                    (function() {
                        if (typeof window.electronAPI === 'undefined') {
                            return {error: 'electronAPI not defined'};
                        }

                        const api = window.electronAPI;
                        const structure = {};

                        for (let key in api) {
                            if (typeof api[key] === 'function') {
                                structure[key] = 'function';
                            } else if (typeof api[key] === 'object' && api[key] !== null) {
                                structure[key] = {};
                                for (let subkey in api[key]) {
                                    structure[key][subkey] = typeof api[key][subkey];
                                }
                            } else {
                                structure[key] = typeof api[key];
                            }
                        }

                        return structure;
                    })()
                """,
                "returnByValue": True
            }
        }))

        # Wait for the response (may receive notifications first)
        result = None
        for _ in range(10):  # Try up to 10 messages
            response = await ws.recv()
            msg = json.loads(response)
            if "id" in msg and msg["id"] == 2:
                result = msg
                break

        if result and "result" in result and "result" in result["result"]:
            api_structure = result["result"]["result"]["value"]
            print("📊 window.electronAPI Structure:")
            print("=" * 60)
            print(json.dumps(api_structure, indent=2))

            # Count namespaces and methods
            if isinstance(api_structure, dict) and 'error' not in api_structure:
                namespaces = [k for k, v in api_structure.items() if isinstance(v, dict)]
                functions = [k for k, v in api_structure.items() if v == 'function']

                print("\n" + "=" * 60)
                print(f"Namespaces found: {len(namespaces)}")
                print(f"  {', '.join(namespaces[:10])}")
                print(f"\nTop-level functions: {len(functions)}")
                if functions:
                    print(f"  {', '.join(functions[:10])}")

                # Check specifically for our new APIs
                print("\n" + "=" * 60)
                print("🔍 Checking for new APIs:")
                for api in ['planning', 'vac', 'learning', 'execution']:
                    if api in api_structure and isinstance(api_structure[api], dict):
                        method_count = len(api_structure[api])
                        print(f"  ✅ {api}: {method_count} methods")
                    else:
                        print(f"  ❌ {api}: NOT FOUND")
        else:
            print("❌ Failed to get API structure")
            print(result)

asyncio.run(check_api_structure())
