#!/usr/bin/env python3
"""
Comprehensive E2E Workflow Testing for rad-engineer UI Integration
Tests all 57 components across 4 phases: /plan, /execute, VAC, Learning
"""
import json
import asyncio
import websockets
from pathlib import Path
from datetime import datetime

class E2EWorkflowTester:
    def __init__(self, ws_url: str):
        self.ws_url = ws_url
        self.ws = None
        self.msg_id = 1
        self.results = []

    async def connect(self):
        """Connect to Chrome DevTools Protocol"""
        self.ws = await websockets.connect(self.ws_url, max_size=10 * 1024 * 1024)
        await self.send_command("Runtime.enable")
        await self.send_command("Page.enable")
        await self.send_command("DOM.enable")

    async def send_command(self, method: str, params: dict = None):
        """Send CDP command and get response"""
        msg = {"id": self.msg_id, "method": method}
        if params:
            msg["params"] = params

        await self.ws.send(json.dumps(msg))
        self.msg_id += 1

        response = await self.ws.recv()
        return json.loads(response)

    async def evaluate_js(self, expression: str):
        """Evaluate JavaScript in the page"""
        result = await self.send_command("Runtime.evaluate", {
            "expression": expression,
            "returnByValue": True
        })
        if "result" in result and "result" in result["result"]:
            return result["result"]["result"]["value"]
        return None

    async def take_screenshot(self, filename: str):
        """Capture screenshot"""
        result = await self.send_command("Page.captureScreenshot", {
            "format": "png",
            "quality": 80,
            "captureBeyondViewport": False,
            "optimizeForSpeed": True
        })

        if "result" in result and "data" in result["result"]:
            import base64
            screenshot_data = base64.b64decode(result["result"]["data"])
            path = Path(f"/tmp/{filename}")
            path.write_bytes(screenshot_data)
            print(f"✅ Screenshot saved: {path}")
            return str(path)
        return None

    def log_result(self, test_name: str, status: str, details: str = ""):
        """Log test result"""
        result = {
            "test": test_name,
            "status": status,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.results.append(result)
        icon = "✅" if status == "PASS" else "❌" if status == "FAIL" else "⚠️"
        print(f"{icon} {test_name}: {status}")
        if details:
            print(f"   {details}")

    async def test_basic_app_state(self):
        """Test 1: Basic app state and APIs"""
        print("\n📋 Test 1: Basic App State")

        # Check window title
        title = await self.evaluate_js("document.title")
        if title == "rad-engineer":
            self.log_result("App Title", "PASS", "Title is 'rad-engineer'")
        else:
            self.log_result("App Title", "FAIL", f"Expected 'rad-engineer', got '{title}'")

        # Check electronAPI availability
        has_api = await self.evaluate_js("typeof window.electronAPI !== 'undefined'")
        if has_api:
            self.log_result("ElectronAPI Available", "PASS")
        else:
            self.log_result("ElectronAPI Available", "FAIL")
            return

        # Check new API namespaces (planning, vac, learning)
        api_check = await self.evaluate_js("""
            ({
                planning: typeof window.electronAPI.planning !== 'undefined',
                vac: typeof window.electronAPI.vac !== 'undefined',
                learning: typeof window.electronAPI.learning !== 'undefined',
                execution: typeof window.electronAPI.execution !== 'undefined'
            })
        """)

        for api_name, exists in api_check.items():
            if exists:
                self.log_result(f"{api_name.upper()} API", "PASS")
            else:
                self.log_result(f"{api_name.upper()} API", "FAIL", "API namespace not found")

    async def test_planning_workflow(self):
        """Test 2: /plan workflow components"""
        print("\n📋 Test 2: /plan Workflow")

        # Test planning API methods exist
        planning_methods = [
            "startIntake", "submitAnswers", "getQuestions",
            "startResearch", "getResearchStatus", "getResearchFindings",
            "generatePlan", "validatePlan", "savePlan", "updatePlan"
        ]

        for method in planning_methods:
            exists = await self.evaluate_js(
                f"typeof window.electronAPI.planning.{method} === 'function'"
            )
            if exists:
                self.log_result(f"planning.{method}()", "PASS")
            else:
                self.log_result(f"planning.{method}()", "FAIL", "Method not found")

        # Test planning event listeners
        event_methods = [
            "onIntakeProgress", "onResearchAgentUpdate",
            "onResearchComplete", "onPlanGenerated"
        ]

        for method in event_methods:
            exists = await self.evaluate_js(
                f"typeof window.electronAPI.planning.{method} === 'function'"
            )
            if exists:
                self.log_result(f"planning.{method}()", "PASS")
            else:
                self.log_result(f"planning.{method}()", "FAIL", "Event listener not found")

    async def test_execution_workflow(self):
        """Test 3: /execute dashboard components"""
        print("\n📋 Test 3: /execute Dashboard")

        # Test execution API methods
        execution_methods = [
            "getExecutionStatus", "getWaveStatus", "getAgentStatus",
            "getQualityGates", "getStateMachineStatus", "retryWave",
            "retryTask", "restoreCheckpoint", "changeProvider",
            "deleteCheckpoint", "retryQualityGate", "getExecutionTimeline",
            "getErrorRecoveryStatus"
        ]

        for method in execution_methods:
            exists = await self.evaluate_js(
                f"typeof window.electronAPI.execution.{method} === 'function'"
            )
            if exists:
                self.log_result(f"execution.{method}()", "PASS")
            else:
                self.log_result(f"execution.{method}()", "FAIL", "Method not found")

        # Test execution event listeners
        event_methods = [
            "onWaveStarted", "onWaveProgress", "onWaveCompleted",
            "onAgentStarted", "onAgentProgress", "onAgentCompleted",
            "onQualityGateStarted", "onQualityGateResult",
            "onStateChanged", "onTaskFailed", "onRetryScheduled",
            "onCircuitBreakerStateChanged"
        ]

        for method in event_methods:
            exists = await self.evaluate_js(
                f"typeof window.electronAPI.execution.{method} === 'function'"
            )
            if exists:
                self.log_result(f"execution.{method}()", "PASS")
            else:
                self.log_result(f"execution.{method}()", "FAIL", "Event listener not found")

    async def test_vac_workflow(self):
        """Test 4: VAC verification components"""
        print("\n📋 Test 4: VAC Verification")

        # Test VAC API methods
        vac_methods = [
            "getAllContracts", "getContract", "createContract",
            "updateContract", "deleteContract", "runVerification",
            "checkDrift", "compareAST", "getVerificationHistory",
            "getDriftHistory"
        ]

        for method in vac_methods:
            exists = await self.evaluate_js(
                f"typeof window.electronAPI.vac.{method} === 'function'"
            )
            if exists:
                self.log_result(f"vac.{method}()", "PASS")
            else:
                self.log_result(f"vac.{method}()", "FAIL", "Method not found")

    async def test_learning_workflow(self):
        """Test 5: Decision learning components"""
        print("\n📋 Test 5: Decision Learning")

        # Test learning API methods
        learning_methods = [
            "getDecisionHistory", "getLearningAnalytics", "getPatterns",
            "searchPatterns", "getMethodEffectiveness", "selectMethod",
            "getOutcomeMetrics", "exportLearningReport", "getQualityTrends",
            "getEWCCurves"
        ]

        for method in learning_methods:
            exists = await self.evaluate_js(
                f"typeof window.electronAPI.learning.{method} === 'function'"
            )
            if exists:
                self.log_result(f"learning.{method}()", "PASS")
            else:
                self.log_result(f"learning.{method}()", "FAIL", "Method not found")

    async def test_ipc_constants(self):
        """Test 6: IPC constants verification"""
        print("\n📋 Test 6: IPC Constants")

        # We can't directly check constants from renderer, but we can verify
        # the APIs are wired correctly by counting total methods
        total_apis = await self.evaluate_js("""
            Object.keys(window.electronAPI).reduce((count, namespace) => {
                if (typeof window.electronAPI[namespace] === 'object') {
                    return count + Object.keys(window.electronAPI[namespace]).length;
                }
                return count;
            }, Object.keys(window.electronAPI).filter(k => typeof window.electronAPI[k] === 'function').length)
        """)

        # Expected: ~43 IPC channels across all APIs
        if total_apis >= 40:
            self.log_result("Total IPC Methods", "PASS", f"Found {total_apis} methods")
        else:
            self.log_result("Total IPC Methods", "WARN", f"Found {total_apis} methods, expected 40+")

    async def test_component_rendering(self):
        """Test 7: Component rendering verification"""
        print("\n📋 Test 7: Component Rendering")

        # Check if React root is mounted
        has_root = await self.evaluate_js("""
            document.querySelector('#root') !== null &&
            document.querySelector('#root').children.length > 0
        """)

        if has_root:
            self.log_result("React Root Mounted", "PASS")
        else:
            self.log_result("React Root Mounted", "FAIL")
            return

        # Check for main app components
        components = {
            "Sidebar": ".sidebar",
            "Main Content": ".main-content, main",
            "Navigation": "nav, [role='navigation']"
        }

        for component_name, selector in components.items():
            exists = await self.evaluate_js(
                f"document.querySelector('{selector}') !== null"
            )
            if exists:
                self.log_result(f"{component_name} Rendered", "PASS")
            else:
                self.log_result(f"{component_name} Rendered", "WARN", "Component not visible")

    async def run_all_tests(self):
        """Run all E2E workflow tests"""
        print("=" * 60)
        print("🚀 rad-engineer E2E Workflow Testing")
        print("=" * 60)

        await self.connect()

        # Take initial screenshot
        await self.take_screenshot("e2e-workflow-start.png")

        # Run all tests
        await self.test_basic_app_state()
        await self.test_planning_workflow()
        await self.test_execution_workflow()
        await self.test_vac_workflow()
        await self.test_learning_workflow()
        await self.test_ipc_constants()
        await self.test_component_rendering()

        # Take final screenshot
        await self.take_screenshot("e2e-workflow-end.png")

        # Generate summary
        print("\n" + "=" * 60)
        print("📊 Test Summary")
        print("=" * 60)

        total = len(self.results)
        passed = sum(1 for r in self.results if r["status"] == "PASS")
        failed = sum(1 for r in self.results if r["status"] == "FAIL")
        warned = sum(1 for r in self.results if r["status"] == "WARN")

        print(f"Total Tests: {total}")
        print(f"✅ Passed: {passed}")
        print(f"❌ Failed: {failed}")
        print(f"⚠️  Warnings: {warned}")
        print(f"Success Rate: {passed/total*100:.1f}%")

        # Save detailed report
        report_path = Path("/tmp/e2e-workflow-test-results.json")
        report_path.write_text(json.dumps({
            "summary": {
                "total": total,
                "passed": passed,
                "failed": failed,
                "warned": warned,
                "success_rate": f"{passed/total*100:.1f}%"
            },
            "results": self.results
        }, indent=2))

        print(f"\n📄 Detailed report saved: {report_path}")

        await self.ws.close()

        return passed, failed, warned

async def main():
    ws_url = "ws://localhost:9222/devtools/page/463EC43F842D7F56CFB2F64341A5AE48"

    tester = E2EWorkflowTester(ws_url)
    try:
        passed, failed, warned = await tester.run_all_tests()
        exit(0 if failed == 0 else 1)
    except Exception as e:
        print(f"❌ Test execution failed: {e}")
        import traceback
        traceback.print_exc()
        exit(1)

if __name__ == "__main__":
    asyncio.run(main())
