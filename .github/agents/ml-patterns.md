# ML Decision Patterns for AI Agent System
# Machine Learning-Inspired Decision Making

## Pattern Recognition Database

### Cost-Benefit Decision Tree

```
Decision Required: Should I read this file?
├── File size < 100 lines?
│   ├── YES → Read with view tool (Medium cost)
│   └── NO → Check if grep can answer question first (Low cost)
│       ├── Grep answers question → DONE (Low cost path)
│       └── Grep insufficient → Read with line range (Medium cost)
│
Decision Required: Should I use a subagent?
├── Task complexity score > 7/10?
│   ├── YES → Estimate subagent benefit
│   │   ├── Multi-file changes needed? → Use subagent (saves time)
│   │   └── Single focus task? → Do inline (saves tokens)
│   └── NO → Always do inline (1-2 tool calls)
│
Decision Required: How to batch edits?
├── Files affected > 1?
│   ├── YES → Group by dependency order
│   │   ├── Independent files? → Edit all in parallel
│   │   └── Dependent files? → Edit in sequence
│   └── NO → Single edit operation
```

## Learning Metrics

### File Change Correlation Matrix
Track which files change together (co-occurrence frequency):

```json
{
  "correlations": {
    "public/index.html": ["public/css/style.css", "public/js/main.js"],
    "src/core/GameEngine.js": ["src/renderer/Scene.js", "src/core/Loop.js"],
    "package.json": ["package-lock.json", ".github/workflows/"]
  }
}
```

**Usage:** When editing one file, check correlation matrix to anticipate related changes.

### Error Pattern Recognition

Common patterns that lead to errors:

```json
{
  "error_patterns": [
    {
      "pattern": "edit_without_guardian_check",
      "frequency": "HIGH",
      "severity": "CRITICAL",
      "mitigation": "Always run guardian before/after edits"
    },
    {
      "pattern": "skip_syntax_validation",
      "frequency": "MEDIUM",
      "severity": "HIGH",
      "mitigation": "Run 'node --check' immediately after JS edits"
    },
    {
      "pattern": "large_file_read_unnecessary",
      "frequency": "MEDIUM",
      "severity": "LOW",
      "mitigation": "Use grep or targeted line ranges first"
    },
    {
      "pattern": "sequential_edits_not_batched",
      "frequency": "HIGH",
      "severity": "MEDIUM",
      "mitigation": "Group independent edits into single call"
    }
  ]
}
```

### Performance Optimization Patterns

```json
{
  "optimizations": [
    {
      "scenario": "search_for_function_definition",
      "slow_approach": "read_file(entire_file) → scan manually",
      "fast_approach": "grep 'function_name' → read only matched lines",
      "savings": "80% tokens"
    },
    {
      "scenario": "verify_multiple_files_unchanged",
      "slow_approach": "read_file × N files",
      "fast_approach": "git diff --stat → only read changed files",
      "savings": "90% tokens"
    },
    {
      "scenario": "apply_same_change_to_multiple_files",
      "slow_approach": "sequential edit calls",
      "fast_approach": "parallel edit calls in single response",
      "savings": "70% time"
    }
  ]
}
```

## Reinforcement Learning Rules

### Success Criteria Rewards (+points)
- ✅ QA passes on first run: +10
- ✅ No guardian regressions: +10
- ✅ Task completed under estimated tokens: +5
- ✅ Zero syntax errors after edit: +5
- ✅ Memory checked before file read: +3
- ✅ Batched operations successfully: +5

### Failure Criteria Penalties (-points)
- ❌ QA fails, needs retry: -10
- ❌ Guardian detects regression: -15
- ❌ Syntax error in committed code: -10
- ❌ Unnecessary file read (grep would have worked): -3
- ❌ Sequential calls when batching possible: -5
- ❌ Task incomplete due to budget overrun: -20

### Adaptive Threshold
```python
# Pseudo-code for ML-inspired decision
def should_read_file(file_path, question):
    # Calculate probability grep will answer question
    grep_success_prob = estimate_grep_probability(question, file_path)
    
    if grep_success_prob > 0.7:
        return "use_grep_first"
    elif grep_success_prob > 0.4:
        return "try_grep_then_read_if_needed"
    else:
        return "read_file_directly"

def estimate_grep_probability(question, file_path):
    # Based on historical data
    if "where is defined" in question:
        return 0.9  # grep excellent for definitions
    elif "how does work" in question:
        return 0.3  # grep poor for understanding logic
    elif "count occurrences" in question:
        return 0.95  # grep perfect for counting
    else:
        return 0.5  # default
```

## Bayesian Decision Network

### Prior Probabilities (from historical data)
```
P(QA_passes | guardian_clean) = 0.95
P(QA_passes | guardian_regression) = 0.10
P(syntax_error | node_check_skipped) = 0.60
P(syntax_error | node_check_passed) = 0.02
P(budget_overrun | no_planning) = 0.70
P(budget_overrun | planned_carefully) = 0.15
```

### Decision Rules Based on Probabilities
```
IF P(success | current_approach) < 0.5:
    → Re-evaluate approach
    → Consider cheaper alternative
    → Increase verification steps

IF P(regression | this_edit) > 0.3:
    → Run guardian BEFORE and AFTER
    → Consider smaller incremental changes
    → Increase QA rigor

IF P(budget_overrun | current_plan) > 0.4:
    → Break task into smaller chunks
    → Find cheaper tool alternatives
    → Defer non-critical operations
```

## Neural Network-Inspired Pattern Matching

### Input Features for Decision Making
1. **Task complexity** (1-10 scale)
2. **Files affected** (count)
3. **Lines changed** (estimated)
4. **Risk level** (LOW/MEDIUM/HIGH)
5. **Reversibility** (easily reversible? Y/N)
6. **Time pressure** (user waiting? Y/N)
7. **Budget remaining** (%)

### Decision Weights (learned from experience)
```
complexity × 0.3 +
files_affected × 0.2 +
lines_changed × 0.1 +
risk_level × 0.25 +
(!reversibility) × 0.15
= decision_score

IF decision_score < 3.0:
    → Proceed with standard QA
ELIF decision_score < 6.0:
    → Proceed with enhanced QA
ELSE:
    → Break into smaller tasks OR request user guidance
```

## Continuous Learning Protocol

### After Each Task
1. **Record outcomes** to `/memories/repo/agent-decisions.log`
2. **Update pattern database** with new correlations
3. **Adjust decision weights** based on success/failure
4. **Identify new error patterns** from this session

### Log Format
```json
{
  "timestamp": "2026-04-04T00:00:00Z",
  "task": "Add new feature X",
  "decisions": [
    {
      "decision": "read_file_with_grep_first",
      "outcome": "success",
      "tokens_saved": 450,
      "reward": +5
    },
    {
      "decision": "batch_edits",
      "outcome": "success",
      "time_saved": 30,
      "reward": +5
    }
  ],
  "total_reward": +10,
  "lessons": "Grep-first approach saved significant tokens"
}
```

---

Version: 1.0.0  
Last Updated: 2026-04-04
