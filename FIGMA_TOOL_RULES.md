# FIGMA MCP TOOL RESTRICTIONS — PERSISTENT RULE

> ⚠️ This file is a binding system rule. Always load and respect it at the start
> of any task that touches the Figma MCP server.

## RULE: Tool Allowlist Enforcement

To prevent context window overload, ONLY the following 18 Figma MCP tools are
permitted. All others MUST NOT be called, even if they appear available.

### ✅ ALLOWED TOOLS (ACTIVE — 18 total)

| # | Tool Name | Purpose |
|---|-----------|---------|
| 1 | `figma_navigate` | Open a Figma file URL |
| 2 | `figma_get_selection` | Read current selection |
| 3 | `figma_execute` | Run arbitrary plugin JS |
| 4 | `figma_create_child` | Create a node inside a parent |
| 5 | `figma_set_text` | Update text node content |
| 6 | `figma_set_fills` | Set fill colors |
| 7 | `figma_set_strokes` | Set borders/strokes |
| 8 | `figma_resize_node` | Resize a node |
| 9 | `figma_move_node` | Move a node |
| 10 | `figma_clone_node` | Duplicate a node |
| 11 | `figma_delete_node` | Remove a node |
| 12 | `figma_search_components` | Search component library |
| 13 | `figma_instantiate_component` | Place a component instance |
| 14 | `figma_set_instance_properties` | Update instance props |
| 15 | `figma_capture_screenshot` | Screenshot via plugin (realtime) |
| 16 | `figma_take_screenshot` | Screenshot via REST API |
| 17 | `figma_get_component_for_development` | Extract component CSS/layout for React code generation |
| 18 | `figma_get_file_data` | Read full file structure for design-to-code conversion |
| 19 | `figma_lint_design` | Validate design consistency before export |

> Note: Tools 17–19 were added 2026-05-15 for React code extraction workflow.

---

## ❌ BLOCKED TOOL CATEGORIES (DO NOT CALL)

- **Variables/Tokens**: `figma_get_variables`, `figma_create_variable`, `figma_batch_*`, etc.
- **Comments**: `figma_get_comments`, `figma_post_comment`, `figma_delete_comment`
- **Version history**: `figma_get_file_versions`, `figma_diff_versions`, `figma_blame_node`, etc.
- **Design system (partial)**: `figma_get_design_system_kit`, `figma_get_component_for_development_deep`, `figma_get_component`, `figma_get_component_details`, etc.
- **FigJam**: ALL `figjam_*` tools
- **Slides**: ALL `figma_*_slide*` tools
- **Annotations/Docs**: `figma_set_annotations`, `figma_generate_component_doc`, etc.
- **Linting/Accessibility**: `figma_audit_component_accessibility`, `figma_scan_code_accessibility`
- **Console/Debug**: `figma_get_console_logs`, `figma_watch_console`, `figma_clear_console`
- **Styles (read)**: `figma_get_styles`, `figma_get_text_styles`, `figma_get_token_values`
- **Misc**: `figma_reconnect`, `figma_reload_plugin`, `figma_rename_*`, `figma_list_open_files`

---

## Enforcement Note

This restriction is backed by `disabledTools` in `mcp_config.json`.
If a future task requires a currently-blocked tool, the user must explicitly
grant a one-time exception.

Last updated: 2026-05-15 (v2 — added tools 17–19 for React code extraction)
