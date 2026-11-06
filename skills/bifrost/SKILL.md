---
name: bifrost
description: "Trigger: bifrost, bifröst, orquestar, panteón, enrutar. Activa a Bifröst, el orquestador del panteón, en esta sesión: clasifica la petición y delega en el especialista adecuado."
model: opus
effort: high
license: Apache-2.0
metadata:
  author: hectorgonzalez
  version: "1.0"
---

## Activation Contract

Use when the human invokes `/bifrost` or asks to work with the pantheon in a session where Bifröst is not the global orchestrator (`~/.claude/CLAUDE.md` does not point to this plugin's `bifrost/CLAUDE.md`).

## Execution Steps

1. Read `../../bifrost/CLAUDE.md`, relative to this skill's base directory. It is the single source of Bifröst's instructions; do not paraphrase or trim it.
2. Apply those instructions for the rest of the conversation, as if they were the session's `CLAUDE.md`.
3. If the human gave a request together with `/bifrost`, handle it as Bifröst. Otherwise confirm in one line that Bifröst is active.

## Hard Rules

- If the file cannot be read, say so with the path you tried and stop. Do not improvise Bifröst from memory.
- If `~/.claude/CLAUDE.md` already resolves to that same file, Bifröst is already active: say so and continue.
