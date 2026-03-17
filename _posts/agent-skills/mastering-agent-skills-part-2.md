---
title: "Mastering AI Context: Part 2 - Creating and Orchestrating Agent Skills"
date: "2026-03-18"
excerpt: "A rigorous technical guide on how to architect, test, and manage the priority hierarchy of dynamic Agent Skills in production environments."
coverImage: "/assets/blog/mastering-agent-skills-part-2/cover.png"
author:
  name: Sunando Bhattacharya
  picture: "/assets/blog/authors/sunando-bhattacharya.jpeg"
ogImage:
  url: "/assets/blog/mastering-agent-skills-part-2/cover.png"
releaseDate: "2026-03-18"
---

# Mastering AI Context: Part 2 - Creating and Orchestrating Agent Skills

In the first part of this series, we fundamentally deconstructed the architecture of Agent Skills. We established exactly why dynamically loading isolated markdown files based on semantic intent is vastly superior to continuously injecting gigantic, static `AGENT.md` files into every single conversation. 

Now, we are going to transition entirely from architectural theory to concrete execution. We are going to build a completely functional skill from scratch, meticulously analyze the semantic matching engine that triggers it, and deeply understand the strict priority hierarchy that governs execution when organizational limits fatally collide with personal overrides. 

If you are currently managing an engineering team and trying to strictly enforce code quality, or if you are simply tired of manually correcting your agent's pull request descriptions, this is exactly where you reclaim your engineering time.

## 1. Structuring Your First Skill Directory

For our implementation exercise, we are going to architect a highly specific personal skill that strictly enforces how our agent writes Pull Request descriptions. Because this is a personal workflow optimization, it belongs in our global configuration directory, ensuring it is perpetually available regardless of what repository we are actively modifying.

First, we must establish the physical directory structure. The directory name must perfectly mirror the mathematical name of the skill itself.

```bash
mkdir -p ~/.agent/skills/pr-description
```

Inside this newly minted directory, we create our `SKILL.md` file. This file rigidly adheres to a two-part architectural split, cleanly divided by standard YAML frontmatter dashes.

### 1.1. The Frontmatter: Defining the Semantic Trigger

The frontmatter is not merely documentation; it is the raw fuel for the agent's internal routing engine. 

```yaml
---
name: pr-description
description: Writes pull request descriptions. Use when creating a PR, writing a PR, or when the user asks to summarize changes for a pull request.
---
```

The `name` acts as the definitive identifier. The `description` is significantly more critical. This is the exact text that the orchestrating agent converts into a mathematical embedding vector. The denser and more specific your description, the higher the probability of a flawless semantic match when you issue an ambiguously phrased natural language command.

### 1.2. The Execution Payload: Defining the Ruleset

Directly below the second set of dashes, we inject our strict execution logic. Notice how we do not just tell the agent *what* to output; we strictly mandate the precise terminal commands it must execute to gather the requisite context dynamically.

```markdown
When writing a PR description:

1. Run `git diff main...HEAD` to see all changes on this branch
2. Write a description following this exact format:

## What
One sentence explaining what this PR explicitly accomplishes.

## Why
Brief, high-level context explaining why this architectural change is necessary.

## Changes
1. Specific changes made.
2. Group related internal logic changes together.
3. Explicitly list any files deleted or catastrophically modified.
```

## 2. The Mechanics of Semantic Matching

How exactly does the agent know when to pull this massive payload out of dormition and inject it into the active context window? The process is a highly optimized two-stage pipeline.

1. **The Startup Scan**: When your agent instance boots, it rigorously scans its designated directory paths. Crucially, it parsing and loads *only* the names and descriptions into active memory. It intentionally ignores the heavy execution payloads. This represents a massive token optimization strategy. 
2. **The Vector Evaluation**: The moment you input a prompt, such as "Please explain the state mutations I just made on this branch," the agent computationally compares your prompt's intent against every loaded skill description. Because your prompt semantically overlaps with "summarize changes," the engine registers a highly probable match.

Before it blindly acts, however, the system enforces a strict human-in-the-loop safety protocol. The interface will halt and explicitly prompt you to confirm the loading of the `pr-description` skill. This confirmation gate rigorously guarantees absolute transparency regarding exactly what external instructions are mutating the model's baseline behavior. Only after explicit confirmation does the agent read the complete `SKILL.md` payload from disk.

## 3. The Priority Hierarchy: Resolving Execution Collisions

As your organization inevitably scales its automation strategies, you will encounter namespace collisions. What happens when you clone a repository that contains an incredibly strict, enterprise-mandated `SKILL.md` for code reviews, but your personal global directory (`~/.agent/skills`) also contains a highly customized, vastly different skill sharing the exact same `name`?

The system resolves these conflicts using an absolute, non-negotiable priority hierarchy:

1. **Enterprise Layer**: Managed, organization-wide settings. This tier possesses absolute authority and overrides all underlying configurations.
2. **Personal Layer**: Your global home directory (`~/.agent/skills`). Your personal workflows dominate local configurations.
3. **Project Layer**: The localized `.agent/skills` directory inside a specific repository framework.
4. **Plugins Layer**: Externally installed, heavily abstracted third-party plugins. These hold the lowest possible priority.

This architectural cascade explicitly enables massive engineering organizations to rigidly enforce non-negotiable security standards through Enterprise skills, whilst simultaneously permitting senior developers to maintain highly customized personal workflows in their global environments, provided the namespaces do not conflict. 

To actively prevent accidental overrides, always enforce highly descriptive namespaces. Do not name a skill generically, like `review`. Instead, explicitly scope it to `frontend-react-review` or `backend-rust-audit`.

## 4. State Management and Iteration

Managing the lifecycle of a skill is fundamentally straightforward, mirroring standard file operations. To modify behavior, you simply edit the underlying `SKILL.md` document. To permanently sever a capability, you recursively delete its parent directory.

However, be acutely aware of state caching. Because the agent only loads the metadata pointers during the initial boot sequence, you must firmly restart your agent instance after modifying any skill to actively flush the cache and force a complete filesystem re-evaluation.

In the upcoming third installment of this series, we will advance far beyond basic markdown orchestration. We will explore deeply advanced configuration techniques, enforce strict tool utilization boundaries via the `allowed-tools` parameter, and architect massive, multi-file skill topologies utilizing advanced progressive disclosure semantics. 
