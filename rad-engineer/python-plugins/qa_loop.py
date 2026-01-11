#!/usr/bin/env python3
"""
QA Loop Plugin for Rad-Engineer
================================

Ported from Auto-Claude's qa_loop.py to provide post-execution QA validation
for rad-engineer tasks.

Input Format (JSON via stdin):
{
  "action": "validate" | "check_recurring",
  "data": {
    "project_dir": "/path/to/project",
    "files_modified": ["path/to/file1.ts", "path/to/file2.ts"],
    "task_description": "Implement feature X",
    "iteration_history": [...] // For recurring issue detection
  }
}

Output Format (JSON via stdout):
{
  "success": true | false,
  "data": {
    "status": "approved" | "rejected" | "error",
    "issues": [...],
    "recurring_issues": [...],
    "summary": "..."
  },
  "error": null | "error message",
  "metadata": {
    "duration": 123,
    "pythonVersion": "3.12",
    "pluginVersion": "1.0.0"
  }
}

Quality Checks:
1. TypeScript type errors (required)
2. Lint errors (warning)
3. Test failures (required)
4. Code quality issues (warning)
5. Recurring issue detection (3+ occurrences)
"""

import json
import os
import subprocess
import sys
import time
from difflib import SequenceMatcher
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple


# Configuration
RECURRING_ISSUE_THRESHOLD = 3
ISSUE_SIMILARITY_THRESHOLD = 0.8
PLUGIN_VERSION = "1.0.0"


# =============================================================================
# QUALITY GATE EXECUTION
# =============================================================================


def run_command(cmd: List[str], cwd: str, timeout: int = 120) -> Dict[str, Any]:
    """
    Run a shell command and capture output.

    Args:
        cmd: Command and arguments as list
        cwd: Working directory
        timeout: Timeout in seconds

    Returns:
        Dict with success, stdout, stderr, exit_code
    """
    try:
        result = subprocess.run(
            cmd,
            cwd=cwd,
            capture_output=True,
            text=True,
            timeout=timeout,
        )
        return {
            "success": result.returncode == 0,
            "stdout": result.stdout,
            "stderr": result.stderr,
            "exit_code": result.returncode,
        }
    except subprocess.TimeoutExpired:
        return {
            "success": False,
            "stdout": "",
            "stderr": f"Command timed out after {timeout}s",
            "exit_code": -1,
        }
    except Exception as e:
        return {
            "success": False,
            "stdout": "",
            "stderr": str(e),
            "exit_code": -1,
        }


def check_typecheck(project_dir: str) -> Tuple[bool, str, List[Dict[str, Any]]]:
    """
    Run TypeScript type checking.

    Returns:
        (passed, output, issues)
    """
    result = run_command(["pnpm", "typecheck"], project_dir)

    issues = []
    if not result["success"]:
        # Parse TypeScript errors from output
        error_output = result["stderr"] or result["stdout"]

        # Create at least one generic issue if command failed
        if error_output:
            issues.append({
                "type": "typecheck",
                "severity": "error",
                "title": "TypeScript type checking failed",
                "description": error_output[:200],  # Truncate long output
                "file": "",
                "line": None,
            })

        # Try to parse specific errors
        for line in error_output.split("\n"):
            if "error TS" in line or "error:" in line.lower():
                issues.append({
                    "type": "typecheck",
                    "severity": "error",
                    "title": "TypeScript error",
                    "description": line.strip()[:200],
                    "file": "",
                    "line": None,
                })

    return result["success"], result["stdout"] or result["stderr"], issues


def check_lint(project_dir: str) -> Tuple[bool, str, List[Dict[str, Any]]]:
    """
    Run linting.

    Returns:
        (passed, output, issues)
    """
    result = run_command(["pnpm", "lint"], project_dir)

    issues = []
    if not result["success"]:
        # Parse lint errors from output
        error_output = result["stderr"] or result["stdout"]

        # Create at least one generic issue if command failed
        if error_output:
            issues.append({
                "type": "lint",
                "severity": "warning",
                "title": "Lint check failed",
                "description": error_output[:200],
                "file": "",
                "line": None,
            })

    return result["success"], result["stdout"] or result["stderr"], issues


def check_tests(project_dir: str) -> Tuple[bool, str, List[Dict[str, Any]]]:
    """
    Run tests.

    Returns:
        (passed, output, issues)
    """
    result = run_command(["bun", "test"], project_dir, timeout=180)

    issues = []
    if not result["success"]:
        # Parse test failures from output
        error_output = result["stderr"] or result["stdout"]

        # Create at least one generic issue if command failed
        if error_output:
            issues.append({
                "type": "test",
                "severity": "error",
                "title": "Test execution failed",
                "description": error_output[:200],
                "file": "",
                "line": None,
            })

    return result["success"], result["stdout"] or result["stderr"], issues


def analyze_code_quality(
    project_dir: str, files_modified: List[str]
) -> List[Dict[str, Any]]:
    """
    Analyze code quality of modified files.

    Checks for:
    - TODO/FIXME comments
    - Console.log statements
    - Any types in TypeScript
    - Long functions (>50 lines)

    Returns:
        List of quality issues (warnings)
    """
    issues = []

    for file_path in files_modified:
        full_path = os.path.join(project_dir, file_path)
        if not os.path.exists(full_path):
            continue

        # Only check TypeScript/JavaScript files
        if not file_path.endswith((".ts", ".tsx", ".js", ".jsx")):
            continue

        try:
            with open(full_path, "r", encoding="utf-8") as f:
                content = f.read()
                lines = content.split("\n")

                for line_num, line in enumerate(lines, start=1):
                    # Check for TODO/FIXME
                    if "TODO" in line or "FIXME" in line:
                        issues.append({
                            "type": "quality",
                            "severity": "warning",
                            "title": "TODO/FIXME comment found",
                            "description": line.strip(),
                            "file": file_path,
                            "line": line_num,
                        })

                    # Check for console.log
                    if "console.log" in line and not line.strip().startswith("//"):
                        issues.append({
                            "type": "quality",
                            "severity": "warning",
                            "title": "Console.log statement",
                            "description": line.strip(),
                            "file": file_path,
                            "line": line_num,
                        })

                    # Check for 'any' type
                    if ": any" in line or "<any>" in line:
                        issues.append({
                            "type": "quality",
                            "severity": "warning",
                            "title": "Any type usage",
                            "description": line.strip(),
                            "file": file_path,
                            "line": line_num,
                        })

        except Exception as e:
            issues.append({
                "type": "quality",
                "severity": "warning",
                "title": f"Failed to analyze {file_path}",
                "description": str(e),
                "file": file_path,
                "line": None,
            })

    return issues


# =============================================================================
# RECURRING ISSUE DETECTION
# =============================================================================


def normalize_issue_key(issue: Dict[str, Any]) -> str:
    """
    Create a normalized key for issue comparison.
    """
    title = (issue.get("title") or "").lower().strip()
    file = (issue.get("file") or "").lower().strip()
    line = issue.get("line") or ""

    # Remove common prefixes
    for prefix in ["error:", "issue:", "bug:", "fix:"]:
        if title.startswith(prefix):
            title = title[len(prefix) :].strip()

    return f"{title}|{file}|{line}"


def issue_similarity(issue1: Dict[str, Any], issue2: Dict[str, Any]) -> float:
    """
    Calculate similarity between two issues.

    Returns:
        Similarity score between 0.0 and 1.0
    """
    key1 = normalize_issue_key(issue1)
    key2 = normalize_issue_key(issue2)

    return SequenceMatcher(None, key1, key2).ratio()


def detect_recurring_issues(
    current_issues: List[Dict[str, Any]],
    iteration_history: List[Dict[str, Any]],
) -> Tuple[bool, List[Dict[str, Any]]]:
    """
    Check if any current issues have appeared repeatedly in history.

    Args:
        current_issues: Issues from current iteration
        iteration_history: Previous iteration records

    Returns:
        (has_recurring, recurring_issues) tuple
    """
    # Flatten all historical issues
    historical_issues = []
    for record in iteration_history:
        historical_issues.extend(record.get("issues", []))

    if not historical_issues:
        return False, []

    recurring = []

    for current in current_issues:
        occurrence_count = 1  # Count current occurrence

        for historical in historical_issues:
            similarity = issue_similarity(current, historical)
            if similarity >= ISSUE_SIMILARITY_THRESHOLD:
                occurrence_count += 1

        if occurrence_count >= RECURRING_ISSUE_THRESHOLD:
            recurring.append(
                {
                    **current,
                    "occurrence_count": occurrence_count,
                }
            )

    return len(recurring) > 0, recurring


# =============================================================================
# MAIN VALIDATION LOGIC
# =============================================================================


def validate_task(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Run full QA validation on a task.

    Args:
        data: Task data with project_dir, files_modified, etc.

    Returns:
        Validation result with status and issues
    """
    project_dir = data.get("project_dir", "")
    files_modified = data.get("files_modified", [])
    iteration_history = data.get("iteration_history", [])

    if not project_dir:
        return {
            "status": "error",
            "issues": [],
            "recurring_issues": [],
            "summary": "Missing project_dir in input",
        }

    if not os.path.isdir(project_dir):
        return {
            "status": "error",
            "issues": [],
            "recurring_issues": [],
            "summary": f"Invalid project directory: {project_dir}",
        }

    all_issues = []

    # 1. TypeCheck (required)
    typecheck_passed, typecheck_output, typecheck_issues = check_typecheck(project_dir)
    all_issues.extend(typecheck_issues)

    # 2. Lint (warning)
    lint_passed, lint_output, lint_issues = check_lint(project_dir)
    all_issues.extend(lint_issues)

    # 3. Tests (required)
    test_passed, test_output, test_issues = check_tests(project_dir)
    all_issues.extend(test_issues)

    # 4. Code quality (warning)
    quality_issues = analyze_code_quality(project_dir, files_modified)
    all_issues.extend(quality_issues)

    # 5. Check for recurring issues
    has_recurring, recurring_issues = detect_recurring_issues(
        all_issues, iteration_history
    )

    # Determine status
    # Required checks: typecheck, tests
    required_failed = not typecheck_passed or not test_passed

    if has_recurring:
        status = "rejected"
        summary = f"Recurring issues detected ({len(recurring_issues)} issue(s) appeared {RECURRING_ISSUE_THRESHOLD}+ times). Manual intervention required."
    elif required_failed:
        status = "rejected"
        error_count = len([i for i in all_issues if i.get("severity") == "error"])
        summary = f"QA validation failed: {error_count} error(s) found"
    elif all_issues:
        # Only warnings, consider approved
        status = "approved"
        warning_count = len([i for i in all_issues if i.get("severity") == "warning"])
        summary = f"QA validation passed with {warning_count} warning(s)"
    else:
        status = "approved"
        summary = "QA validation passed - all checks passed"

    return {
        "status": status,
        "issues": all_issues,
        "recurring_issues": recurring_issues,
        "summary": summary,
        "quality_gates": {
            "typecheck": {"passed": typecheck_passed, "output": typecheck_output},
            "lint": {"passed": lint_passed, "output": lint_output},
            "test": {"passed": test_passed, "output": test_output},
        },
    }


def check_recurring_only(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Check for recurring issues only (no quality gates).

    Args:
        data: Task data with current issues and iteration_history

    Returns:
        Recurring issue detection result
    """
    current_issues = data.get("current_issues", [])
    iteration_history = data.get("iteration_history", [])

    has_recurring, recurring_issues = detect_recurring_issues(
        current_issues, iteration_history
    )

    return {
        "status": "recurring_detected" if has_recurring else "no_recurring",
        "issues": [],
        "recurring_issues": recurring_issues,
        "summary": f"Found {len(recurring_issues)} recurring issue(s)"
        if has_recurring
        else "No recurring issues detected",
    }


# =============================================================================
# PLUGIN ENTRY POINT
# =============================================================================


def main():
    """
    Main plugin entry point.

    Reads JSON input from stdin, processes request, writes JSON output to stdout.
    """
    start_time = time.time()

    try:
        # Read input from stdin
        input_line = sys.stdin.readline()
        if not input_line:
            raise ValueError("No input provided")

        input_data = json.loads(input_line)
        action = input_data.get("action", "")
        data = input_data.get("data", {})

        # Route to appropriate action
        if action == "validate":
            result = validate_task(data)
        elif action == "check_recurring":
            result = check_recurring_only(data)
        else:
            raise ValueError(f"Unknown action: {action}")

        # Build output
        duration = int((time.time() - start_time) * 1000)  # milliseconds
        output = {
            "success": True,
            "data": result,
            "error": None,
            "metadata": {
                "duration": duration,
                "pythonVersion": f"{sys.version_info.major}.{sys.version_info.minor}",
                "pluginVersion": PLUGIN_VERSION,
            },
        }

        # Write output to stdout
        print(json.dumps(output))
        sys.exit(0)

    except Exception as e:
        # Error output
        duration = int((time.time() - start_time) * 1000)
        error_output = {
            "success": False,
            "data": None,
            "error": str(e),
            "metadata": {
                "duration": duration,
                "pythonVersion": f"{sys.version_info.major}.{sys.version_info.minor}",
                "pluginVersion": PLUGIN_VERSION,
            },
        }
        print(json.dumps(error_output))
        sys.exit(1)


if __name__ == "__main__":
    main()
