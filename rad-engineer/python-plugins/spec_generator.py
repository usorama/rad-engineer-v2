#!/usr/bin/env python3
"""
Spec Generator Plugin for rad-engineer
========================================

Ported from Auto-Claude's spec_runner.py to provide spec generation capabilities
within rad-engineer. Uses dynamic complexity-based phase selection.

This plugin acts as a bridge to Auto-Claude's spec generation system,
allowing rad-engineer to leverage proven multi-phase spec creation.

Complexity Tiers:
- SIMPLE (1-2 files): Discovery → Quick Spec → Validate (3 phases)
- STANDARD (3-10 files): Discovery → Requirements → Context → Spec → Plan → Validate (6 phases)
- STANDARD + Research: Same as above but with research phase (7 phases)
- COMPLEX (10+ files): Full 8-phase pipeline with research and self-critique

Input Protocol (JSON via stdin):
{
  "action": "assess_complexity" | "generate_spec" | "get_phase_list",
  "data": {
    "task_description": str,
    "project_dir": str,
    "spec_dir": str,
    "complexity": "simple" | "standard" | "complex" (optional),
    "use_ai": bool (optional, default: false)
  },
  "config": {
    "timeout": int (optional),
    "model": str (optional)
  }
}

Output Protocol (JSON via stdout):
{
  "success": bool,
  "data": {
    "complexity": str,
    "estimated_files": int,
    "requires_research": bool,
    "phases_run": list[str],
    "spec_path": str,
    "plan_path": str,
    "reasoning": str (optional)
  },
  "error": str | null,
  "metadata": {
    "duration": float,
    "python_version": str,
    "plugin_version": str
  }
}
"""

import sys
import json
import time
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

# Plugin version
PLUGIN_VERSION = "1.0.0"

# Phase definitions by complexity
PHASE_DEFINITIONS = {
    "simple": ["discovery", "quick_spec", "validate"],
    "standard": ["discovery", "requirements", "context", "spec_writing", "plan", "validate"],
    "standard_research": ["discovery", "requirements", "research", "context", "spec_writing", "plan", "validate"],
    "complex": ["discovery", "requirements", "research", "context", "spec_writing", "plan", "critique", "validate"],
}

# Estimated durations (seconds)
PHASE_DURATIONS = {
    "discovery": 20,
    "quick_spec": 50,
    "requirements": 45,
    "research": 90,
    "context": 60,
    "spec_writing": 90,
    "plan": 75,
    "critique": 120,
    "validate": 20,
}


def assess_complexity_heuristic(task_description: str) -> Tuple[str, int, bool, str]:
    """
    Heuristic-based complexity assessment.

    Args:
        task_description: Task description text

    Returns:
        Tuple of (complexity, estimated_files, requires_research, reasoning)
    """
    task_lower = task_description.lower()

    # Keywords that indicate complexity
    simple_keywords = ["fix", "typo", "update", "change", "rename", "color", "text"]
    complex_keywords = ["integration", "system", "architecture", "database", "api", "authentication", "migration", "memory", "search", "semantic"]
    research_keywords = ["graphiti", "falkordb", "docker", "kubernetes", "aws", "external", "third-party", "backend"]

    # Count indicators
    simple_count = sum(1 for kw in simple_keywords if kw in task_lower)
    complex_count = sum(1 for kw in complex_keywords if kw in task_lower)
    research_needed = any(kw in task_lower for kw in research_keywords)

    # Estimate based on task length and keywords
    task_words = len(task_description.split())

    if simple_count > 0 and task_words < 10:
        return "simple", 1, False, "Short task with simple keywords"
    elif complex_count >= 3 or task_words > 30 or research_needed:
        estimated_files = min(20, 10 + complex_count * 2)
        return "complex", estimated_files, research_needed, "Multiple complex components or integrations"
    elif complex_count > 0:
        estimated_files = min(8, 3 + complex_count)
        return "standard", estimated_files, research_needed, "Standard feature development"
    else:
        # Default to standard for most tasks
        return "standard", 5, False, "Standard feature development"


def get_phase_list(complexity: str, requires_research: bool = False) -> List[str]:
    """
    Get the list of phases for a given complexity.

    Args:
        complexity: Complexity level (simple/standard/complex)
        requires_research: Whether research phase is needed

    Returns:
        List of phase names
    """
    if complexity == "simple":
        return PHASE_DEFINITIONS["simple"]
    elif complexity == "complex":
        return PHASE_DEFINITIONS["complex"]
    elif requires_research:
        return PHASE_DEFINITIONS["standard_research"]
    else:
        return PHASE_DEFINITIONS["standard"]


def estimate_duration(phases: List[str]) -> int:
    """
    Estimate total duration for phases.

    Args:
        phases: List of phase names

    Returns:
        Estimated duration in seconds
    """
    return sum(PHASE_DURATIONS.get(phase, 60) for phase in phases)


def handle_assess_complexity(data: Dict[str, Any]) -> Tuple[Dict[str, Any], bool, Optional[str]]:
    """
    Handle complexity assessment request.

    Args:
        data: Request data

    Returns:
        Tuple of (response_data, success, error)
    """
    task_description = data.get("task_description", "")
    use_ai = data.get("use_ai", False)

    if not task_description:
        return {}, False, "Missing or empty task description"

    # For now, only heuristic assessment is implemented
    # AI assessment would require Auto-Claude integration
    if use_ai:
        # Fallback to heuristic when AI not available
        complexity, estimated_files, requires_research, reasoning = assess_complexity_heuristic(task_description)
        reasoning = f"Heuristic (AI unavailable): {reasoning}"
    else:
        complexity, estimated_files, requires_research, reasoning = assess_complexity_heuristic(task_description)

    return {
        "complexity": complexity,
        "estimated_files": estimated_files,
        "requires_research": requires_research,
        "reasoning": reasoning
    }, True, None


def handle_generate_spec(data: Dict[str, Any]) -> Tuple[Dict[str, Any], bool, Optional[str]]:
    """
    Handle spec generation request.

    This is a stub implementation that returns mock data.
    Full implementation would require:
    1. Integration with Auto-Claude's SpecOrchestrator
    2. Agent execution with Claude SDK
    3. File system operations for spec directory

    Args:
        data: Request data

    Returns:
        Tuple of (response_data, success, error)
    """
    task_description = data.get("task_description", "")
    project_dir = data.get("project_dir", "")
    spec_dir = data.get("spec_dir", "")
    complexity = data.get("complexity")

    if not all([task_description, project_dir, spec_dir]):
        return {}, False, "Missing required parameters (task_description, project_dir, spec_dir)"

    # Validate paths
    if not Path(project_dir).exists():
        return {}, False, f"Project directory not found: {project_dir}"

    # Auto-detect complexity if not provided
    if not complexity:
        complexity, _, requires_research, _ = assess_complexity_heuristic(task_description)
    else:
        requires_research = "integration" in task_description.lower()

    # Get phases to run
    phases = get_phase_list(complexity, requires_research)

    # Mock spec generation
    # In real implementation, this would:
    # 1. Initialize SpecOrchestrator from Auto-Claude
    # 2. Run each phase with agent execution
    # 3. Write spec.md and implementation_plan.json
    # 4. Validate outputs

    spec_path = str(Path(spec_dir) / "spec.md")
    plan_path = str(Path(spec_dir) / "implementation_plan.json")

    # Create mock outputs for testing
    Path(spec_dir).mkdir(parents=True, exist_ok=True)

    # Write minimal spec
    spec_content = f"""# {task_description}

## Overview
This specification was generated by the rad-engineer spec generator plugin.

## Complexity
- Level: {complexity}
- Phases: {', '.join(phases)}

## Implementation Plan
See implementation_plan.json for detailed subtasks.
"""
    Path(spec_path).write_text(spec_content)

    # Write minimal plan
    plan_content = {
        "task": task_description,
        "complexity": complexity,
        "subtasks": [
            {
                "id": 1,
                "title": f"Implement {task_description}",
                "description": "Main implementation task",
                "status": "pending"
            }
        ]
    }
    Path(plan_path).write_text(json.dumps(plan_content, indent=2))

    return {
        "complexity": complexity,
        "phases_run": phases,
        "spec_path": spec_path,
        "plan_path": plan_path,
        "requires_research": requires_research
    }, True, None


def handle_get_phase_list(data: Dict[str, Any]) -> Tuple[Dict[str, Any], bool, Optional[str]]:
    """
    Handle phase list request.

    Args:
        data: Request data

    Returns:
        Tuple of (response_data, success, error)
    """
    complexity = data.get("complexity", "standard")
    requires_research = data.get("requires_research", False)

    phases = get_phase_list(complexity, requires_research)
    duration = estimate_duration(phases)

    return {
        "phases": phases,
        "estimated_duration": duration,
        "phase_count": len(phases)
    }, True, None


def main():
    """Main plugin entry point."""
    start_time = time.time()

    try:
        # Read input from stdin
        input_line = sys.stdin.readline()
        if not input_line:
            raise ValueError("No input provided")

        input_data = json.loads(input_line)
        action = input_data.get("action")
        data = input_data.get("data", {})

        # Route to appropriate handler
        if action == "assess_complexity":
            result_data, success, error = handle_assess_complexity(data)
        elif action == "generate_spec":
            result_data, success, error = handle_generate_spec(data)
        elif action == "get_phase_list":
            result_data, success, error = handle_get_phase_list(data)
        else:
            result_data = {}
            success = False
            error = f"Unknown action: {action}"

        # Build output
        output = {
            "success": success,
            "data": result_data if success else None,
            "error": error,
            "metadata": {
                "duration": (time.time() - start_time) * 1000,  # Convert to ms
                "python_version": f"{sys.version_info.major}.{sys.version_info.minor}",
                "plugin_version": PLUGIN_VERSION
            }
        }

        # Write output to stdout
        print(json.dumps(output))
        sys.exit(0)

    except Exception as e:
        # Error response
        output = {
            "success": False,
            "data": None,
            "error": str(e),
            "metadata": {
                "duration": (time.time() - start_time) * 1000,
                "python_version": f"{sys.version_info.major}.{sys.version_info.minor}",
                "plugin_version": PLUGIN_VERSION
            }
        }
        print(json.dumps(output))
        sys.exit(1)


if __name__ == "__main__":
    main()
