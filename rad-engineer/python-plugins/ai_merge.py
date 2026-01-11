#!/usr/bin/env python3
"""Python 3.9+ compatible - uses Union instead of | for type hints"""
"""
AI Merge Conflict Resolver Plugin
==================================

Ported from Auto-Claude's merge/ai_resolver/resolver.py
Adapted for rad-engineer workflow integration.

This plugin resolves git merge conflicts using AI with minimal context.
It uses the PythonPluginBridge JSON protocol for TypeScript integration.

Input JSON format:
{
    "action": "resolve_conflict" | "resolve_batch" | "build_context",
    "data": {
        "conflict": ConflictRegion (dict),
        "conflicts": [ConflictRegion] (for batch),
        "baseline_code": str,
        "task_snapshots": [TaskSnapshot],
        "ai_provider": "anthropic" | "openai",
        "api_key": str,
        "model": str (optional),
        "max_context_tokens": int (optional)
    },
    "config": {
        "timeout": int (optional),
        "max_retries": int (optional)
    }
}

Output JSON format:
{
    "success": bool,
    "data": {
        "decision": str,
        "merged_content": str | null,
        "conflicts_resolved": [ConflictRegion],
        "conflicts_remaining": [ConflictRegion],
        "ai_calls_made": int,
        "tokens_used": int,
        "explanation": str,
        "error": str | null
    },
    "error": str | null,
    "metadata": {
        "duration": float,
        "pythonVersion": str
    }
}
"""

import json
import sys
import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Callable, Optional, List, Dict, Tuple

# Type aliases
AICallFunction = Callable[[str, str], str]


# ============================================================================
# ENUMS (from Auto-Claude types)
# ============================================================================


class ChangeType(Enum):
    """Semantic classification of code changes."""

    ADD_IMPORT = "add_import"
    REMOVE_IMPORT = "remove_import"
    MODIFY_IMPORT = "modify_import"
    ADD_FUNCTION = "add_function"
    REMOVE_FUNCTION = "remove_function"
    MODIFY_FUNCTION = "modify_function"
    RENAME_FUNCTION = "rename_function"
    ADD_HOOK_CALL = "add_hook_call"
    REMOVE_HOOK_CALL = "remove_hook_call"
    WRAP_JSX = "wrap_jsx"
    UNWRAP_JSX = "unwrap_jsx"
    ADD_JSX_ELEMENT = "add_jsx_element"
    MODIFY_JSX_PROPS = "modify_jsx_props"
    ADD_VARIABLE = "add_variable"
    REMOVE_VARIABLE = "remove_variable"
    MODIFY_VARIABLE = "modify_variable"
    ADD_CONSTANT = "add_constant"
    ADD_CLASS = "add_class"
    REMOVE_CLASS = "remove_class"
    MODIFY_CLASS = "modify_class"
    ADD_METHOD = "add_method"
    REMOVE_METHOD = "remove_method"
    MODIFY_METHOD = "modify_method"
    ADD_PROPERTY = "add_property"
    ADD_TYPE = "add_type"
    MODIFY_TYPE = "modify_type"
    ADD_INTERFACE = "add_interface"
    MODIFY_INTERFACE = "modify_interface"
    ADD_DECORATOR = "add_decorator"
    REMOVE_DECORATOR = "remove_decorator"
    ADD_COMMENT = "add_comment"
    MODIFY_COMMENT = "modify_comment"
    FORMATTING_ONLY = "formatting_only"
    UNKNOWN = "unknown"


class ConflictSeverity(Enum):
    """Severity levels for detected conflicts."""

    NONE = "none"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class MergeStrategy(Enum):
    """Strategies for merging compatible changes."""

    COMBINE_IMPORTS = "combine_imports"
    HOOKS_FIRST = "hooks_first"
    HOOKS_THEN_WRAP = "hooks_then_wrap"
    APPEND_STATEMENTS = "append_statements"
    APPEND_FUNCTIONS = "append_functions"
    APPEND_METHODS = "append_methods"
    COMBINE_PROPS = "combine_props"
    ORDER_BY_DEPENDENCY = "order_by_dependency"
    ORDER_BY_TIME = "order_by_time"
    AI_REQUIRED = "ai_required"
    HUMAN_REQUIRED = "human_required"


class MergeDecision(Enum):
    """Decision outcomes from the merge system."""

    AUTO_MERGED = "auto_merged"
    AI_MERGED = "ai_merged"
    NEEDS_HUMAN_REVIEW = "needs_human_review"
    FAILED = "failed"


# ============================================================================
# DATA STRUCTURES
# ============================================================================


@dataclass
class SemanticChange:
    """A single semantic change within a file."""

    change_type: str  # ChangeType enum value
    target: str
    location: str
    line_start: int
    line_end: int
    content_before: Optional[str] = None
    content_after: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "SemanticChange":
        return cls(
            change_type=data["change_type"],
            target=data["target"],
            location=data["location"],
            line_start=data["line_start"],
            line_end=data["line_end"],
            content_before=data.get("content_before"),
            content_after=data.get("content_after"),
            metadata=data.get("metadata", {}),
        )

    def to_dict(self) -> Dict[str, Any]:
        return {
            "change_type": self.change_type,
            "target": self.target,
            "location": self.location,
            "line_start": self.line_start,
            "line_end": self.line_end,
            "content_before": self.content_before,
            "content_after": self.content_after,
            "metadata": self.metadata,
        }


@dataclass
class ConflictRegion:
    """A detected conflict between multiple task changes."""

    file_path: str
    location: str
    tasks_involved: List[str]
    change_types: List[str]  # ChangeType enum values
    severity: str  # ConflictSeverity enum value
    can_auto_merge: bool
    merge_strategy: Optional[str] = None  # MergeStrategy enum value
    reason: str = ""

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "ConflictRegion":
        return cls(
            file_path=data["file_path"],
            location=data["location"],
            tasks_involved=data["tasks_involved"],
            change_types=data["change_types"],
            severity=data["severity"],
            can_auto_merge=data["can_auto_merge"],
            merge_strategy=data.get("merge_strategy"),
            reason=data.get("reason", ""),
        )

    def to_dict(self) -> Dict[str, Any]:
        return {
            "file_path": self.file_path,
            "location": self.location,
            "tasks_involved": self.tasks_involved,
            "change_types": self.change_types,
            "severity": self.severity,
            "can_auto_merge": self.can_auto_merge,
            "merge_strategy": self.merge_strategy,
            "reason": self.reason,
        }


@dataclass
class TaskSnapshot:
    """A snapshot of a task's changes to a file."""

    task_id: str
    task_intent: str
    started_at: str  # ISO format datetime
    completed_at: Optional[str] = None
    content_hash_before: str = ""
    content_hash_after: str = ""
    semantic_changes: List[SemanticChange] = field(default_factory=list)
    raw_diff: Optional[str] = None

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "TaskSnapshot":
        return cls(
            task_id=data["task_id"],
            task_intent=data["task_intent"],
            started_at=data["started_at"],
            completed_at=data.get("completed_at"),
            content_hash_before=data.get("content_hash_before", ""),
            content_hash_after=data.get("content_hash_after", ""),
            semantic_changes=[
                SemanticChange.from_dict(c) for c in data.get("semantic_changes", [])
            ],
            raw_diff=data.get("raw_diff"),
        )


@dataclass
class MergeResult:
    """Result of a merge operation."""

    decision: str  # MergeDecision enum value
    file_path: str
    merged_content: Optional[str] = None
    conflicts_resolved: List[ConflictRegion] = field(default_factory=list)
    conflicts_remaining: List[ConflictRegion] = field(default_factory=list)
    ai_calls_made: int = 0
    tokens_used: int = 0
    explanation: str = ""
    error: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "decision": self.decision,
            "file_path": self.file_path,
            "merged_content": self.merged_content,
            "conflicts_resolved": [c.to_dict() for c in self.conflicts_resolved],
            "conflicts_remaining": [c.to_dict() for c in self.conflicts_remaining],
            "ai_calls_made": self.ai_calls_made,
            "tokens_used": self.tokens_used,
            "explanation": self.explanation,
            "error": self.error,
        }


@dataclass
class ConflictContext:
    """Minimal context needed to resolve a conflict."""

    file_path: str
    location: str
    baseline_code: str
    task_changes: List[tuple[str, str, list[SemanticChange]]]
    conflict_description: str
    language: str = "unknown"

    def to_prompt_context(self) -> str:
        """Format as context for the AI prompt."""
        lines = [
            f"File: {self.file_path}",
            f"Location: {self.location}",
            f"Language: {self.language}",
            "",
            "--- BASELINE CODE (before any changes) ---",
            self.baseline_code,
            "--- END BASELINE ---",
            "",
            "CHANGES FROM EACH TASK:",
        ]

        for task_id, intent, changes in self.task_changes:
            lines.append(f"\n[Task: {task_id}]")
            lines.append(f"Intent: {intent}")
            lines.append("Changes:")
            for change in changes:
                lines.append(f"  - {change.change_type}: {change.target}")
                if change.content_after:
                    content = change.content_after
                    if len(content) > 500:
                        content = content[:500] + "... (truncated)"
                    lines.append(f"    Code: {content}")

        lines.extend(["", f"CONFLICT: {self.conflict_description}"])
        return "\n".join(lines)

    @property
    def estimated_tokens(self) -> int:
        """Rough estimate of tokens in this context."""
        text = self.to_prompt_context()
        return len(text) // 4


# ============================================================================
# UTILITIES
# ============================================================================


def infer_language(file_path: str) -> str:
    """Infer programming language from file path."""
    ext_map = {
        ".py": "python",
        ".js": "javascript",
        ".ts": "typescript",
        ".tsx": "tsx",
        ".jsx": "jsx",
        ".go": "go",
        ".rs": "rust",
        ".java": "java",
        ".kt": "kotlin",
        ".swift": "swift",
        ".rb": "ruby",
        ".php": "php",
        ".css": "css",
        ".html": "html",
        ".json": "json",
        ".yaml": "yaml",
        ".yml": "yaml",
        ".md": "markdown",
    }

    for ext, lang in ext_map.items():
        if file_path.endswith(ext):
            return lang
    return "text"


def locations_overlap(loc1: str, loc2: str) -> bool:
    """Check if two code locations might overlap."""
    if loc1 == loc2:
        return True
    if loc1.startswith(loc2) or loc2.startswith(loc1):
        return True
    if loc1.startswith("function:") and loc2.startswith("function:"):
        return loc1.split(":")[1] == loc2.split(":")[1]
    return False


def extract_code_block(response: str, language: str) -> Optional[str]:
    """Extract code block from AI response."""
    import re

    patterns = [
        rf"```{language}\n(.*?)```",
        rf"```{language.lower()}\n(.*?)```",
        r"```\n(.*?)```",
        r"```(.*?)```",
    ]

    for pattern in patterns:
        match = re.search(pattern, response, re.DOTALL)
        if match:
            return match.group(1).strip()

    return None


# ============================================================================
# AI RESOLVER
# ============================================================================


SYSTEM_PROMPT = "You are an expert code merge assistant. Be concise and precise."

MERGE_PROMPT_TEMPLATE = """You are a code merge assistant. Your task is to merge changes from multiple development tasks into a single coherent result.

CONTEXT:
{context}

INSTRUCTIONS:
1. Analyze what each task intended to accomplish
2. Merge the changes so that ALL task intents are preserved
3. Resolve any conflicts by understanding the semantic purpose
4. Output ONLY the merged code - no explanations

RULES:
- All imports from all tasks should be included
- All hook calls should be preserved (order matters: earlier tasks first)
- If tasks modify the same function, combine their changes logically
- If tasks wrap JSX differently, apply wrappings from outside-in (earlier task = outer)
- Preserve code style consistency

OUTPUT FORMAT:
Return only the merged code block, wrapped in triple backticks with the language:
```{language}
merged code here
```

Merge the code now:"""


class AIResolver:
    """Resolves conflicts using AI with minimal context."""

    MAX_CONTEXT_TOKENS = 4000

    def __init__(
        self,
        ai_call_fn: Optional[AICallFunction] = None,
        max_context_tokens: int = MAX_CONTEXT_TOKENS,
    ):
        self.ai_call_fn = ai_call_fn
        self.max_context_tokens = max_context_tokens
        self._call_count = 0
        self._total_tokens = 0

    def set_ai_function(self, ai_call_fn: AICallFunction) -> None:
        """Set the AI call function after initialization."""
        self.ai_call_fn = ai_call_fn

    @property
    def stats(self) -> dict[str, int]:
        """Get usage statistics."""
        return {
            "calls_made": self._call_count,
            "estimated_tokens_used": self._total_tokens,
        }

    def reset_stats(self) -> None:
        """Reset usage statistics."""
        self._call_count = 0
        self._total_tokens = 0

    def build_context(
        self,
        conflict: ConflictRegion,
        baseline_code: str,
        task_snapshots: List[TaskSnapshot],
    ) -> ConflictContext:
        """Build minimal context for a conflict."""
        task_changes: List[tuple[str, str, list[SemanticChange]]] = []

        for snapshot in task_snapshots:
            if snapshot.task_id not in conflict.tasks_involved:
                continue

            relevant_changes = [
                c
                for c in snapshot.semantic_changes
                if c.location == conflict.location
                or locations_overlap(c.location, conflict.location)
            ]

            if relevant_changes:
                task_changes.append(
                    (snapshot.task_id, snapshot.task_intent or "No intent specified", relevant_changes)
                )

        language = infer_language(conflict.file_path)

        change_types = conflict.change_types
        description = (
            f"Tasks {', '.join(conflict.tasks_involved)} made conflicting changes: "
            f"{', '.join(change_types)}. "
            f"Severity: {conflict.severity}. "
            f"{conflict.reason}"
        )

        return ConflictContext(
            file_path=conflict.file_path,
            location=conflict.location,
            baseline_code=baseline_code,
            task_changes=task_changes,
            conflict_description=description,
            language=language,
        )

    def resolve_conflict(
        self,
        conflict: ConflictRegion,
        baseline_code: str,
        task_snapshots: List[TaskSnapshot],
    ) -> MergeResult:
        """Resolve a conflict using AI."""
        if not self.ai_call_fn:
            return MergeResult(
                decision=MergeDecision.NEEDS_HUMAN_REVIEW.value,
                file_path=conflict.file_path,
                explanation="No AI function configured",
                conflicts_remaining=[conflict],
            )

        context = self.build_context(conflict, baseline_code, task_snapshots)

        if context.estimated_tokens > self.max_context_tokens:
            return MergeResult(
                decision=MergeDecision.NEEDS_HUMAN_REVIEW.value,
                file_path=conflict.file_path,
                explanation=f"Context too large for AI ({context.estimated_tokens} tokens)",
                conflicts_remaining=[conflict],
            )

        prompt_context = context.to_prompt_context()
        prompt = MERGE_PROMPT_TEMPLATE.format(context=prompt_context, language=context.language)

        try:
            response = self.ai_call_fn(SYSTEM_PROMPT, prompt)
            self._call_count += 1
            self._total_tokens += context.estimated_tokens + len(response) // 4

            merged_code = extract_code_block(response, context.language)

            if merged_code:
                return MergeResult(
                    decision=MergeDecision.AI_MERGED.value,
                    file_path=conflict.file_path,
                    merged_content=merged_code,
                    conflicts_resolved=[conflict],
                    ai_calls_made=1,
                    tokens_used=context.estimated_tokens,
                    explanation=f"AI resolved conflict at {conflict.location}",
                )
            else:
                return MergeResult(
                    decision=MergeDecision.NEEDS_HUMAN_REVIEW.value,
                    file_path=conflict.file_path,
                    explanation="Could not parse AI merge response",
                    conflicts_remaining=[conflict],
                    ai_calls_made=1,
                    tokens_used=context.estimated_tokens,
                )

        except Exception as e:
            return MergeResult(
                decision=MergeDecision.FAILED.value,
                file_path=conflict.file_path,
                error=str(e),
                conflicts_remaining=[conflict],
            )


# ============================================================================
# AI PROVIDER INTEGRATION
# ============================================================================


def create_anthropic_client(api_key: str, model: str = "claude-sonnet-4-5-20250929"):
    """Create Anthropic AI call function."""
    try:
        from anthropic import Anthropic
    except ImportError:
        raise RuntimeError("anthropic package not installed. Run: pip install anthropic")

    client = Anthropic(api_key=api_key)

    def call_ai(system_prompt: str, user_prompt: str) -> str:
        response = client.messages.create(
            model=model,
            max_tokens=2000,
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}],
        )
        return response.content[0].text

    return call_ai


def create_openai_client(api_key: str, model: str = "gpt-4o"):
    """Create OpenAI AI call function."""
    try:
        from openai import OpenAI
    except ImportError:
        raise RuntimeError("openai package not installed. Run: pip install openai")

    client = OpenAI(api_key=api_key)

    def call_ai(system_prompt: str, user_prompt: str) -> str:
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
        )
        return response.choices[0].message.content

    return call_ai


# ============================================================================
# PLUGIN ACTIONS
# ============================================================================


def action_resolve_conflict(data: Dict[str, Any]) -> Dict[str, Any]:
    """Resolve a single conflict."""
    conflict = ConflictRegion.from_dict(data["conflict"])
    baseline_code = data["baseline_code"]
    task_snapshots = [TaskSnapshot.from_dict(ts) for ts in data["task_snapshots"]]
    ai_provider = data.get("ai_provider", "anthropic")
    api_key = data.get("api_key")
    model = data.get("model")
    max_context_tokens = data.get("max_context_tokens", 4000)

    if not api_key:
        return {
            "success": False,
            "data": None,
            "error": "API key is required",
        }

    # Create AI client
    if ai_provider == "anthropic":
        ai_call_fn = create_anthropic_client(api_key, model or "claude-sonnet-4-5-20250929")
    elif ai_provider == "openai":
        ai_call_fn = create_openai_client(api_key, model or "gpt-4o")
    else:
        return {
            "success": False,
            "data": None,
            "error": f"Unsupported AI provider: {ai_provider}",
        }

    # Resolve conflict
    resolver = AIResolver(ai_call_fn, max_context_tokens)
    result = resolver.resolve_conflict(conflict, baseline_code, task_snapshots)

    return {
        "success": True,
        "data": result.to_dict(),
        "error": None,
    }


def action_build_context(data: Dict[str, Any]) -> Dict[str, Any]:
    """Build conflict context without resolving."""
    conflict = ConflictRegion.from_dict(data["conflict"])
    baseline_code = data["baseline_code"]
    task_snapshots = [TaskSnapshot.from_dict(ts) for ts in data["task_snapshots"]]

    resolver = AIResolver()
    context = resolver.build_context(conflict, baseline_code, task_snapshots)

    return {
        "success": True,
        "data": {
            "file_path": context.file_path,
            "location": context.location,
            "language": context.language,
            "prompt_context": context.to_prompt_context(),
            "estimated_tokens": context.estimated_tokens,
        },
        "error": None,
    }


# ============================================================================
# MAIN PLUGIN ENTRY POINT
# ============================================================================


def main():
    """Main plugin entry point - reads JSON from stdin, writes JSON to stdout."""
    start_time = time.time()

    try:
        # Read input from stdin
        input_line = sys.stdin.readline()
        if not input_line:
            raise ValueError("No input provided")

        input_data = json.loads(input_line)
        action = input_data.get("action")
        data = input_data.get("data", {})

        # Route to action handlers
        if action == "resolve_conflict":
            result = action_resolve_conflict(data)
        elif action == "build_context":
            result = action_build_context(data)
        else:
            result = {
                "success": False,
                "data": None,
                "error": f"Unknown action: {action}",
            }

        # Add metadata
        result["metadata"] = {
            "duration": time.time() - start_time,
            "pythonVersion": sys.version.split()[0],
        }

        # Write output to stdout
        print(json.dumps(result))
        sys.exit(0)

    except Exception as e:
        # Error output
        error_result = {
            "success": False,
            "data": None,
            "error": str(e),
            "metadata": {
                "duration": time.time() - start_time,
                "pythonVersion": sys.version.split()[0],
            },
        }
        print(json.dumps(error_result))
        sys.exit(1)


if __name__ == "__main__":
    main()
