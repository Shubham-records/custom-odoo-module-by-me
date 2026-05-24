# Odoo 19 HTML Editor & Toolbar Findings

This document outlines the core mechanisms discovered in Odoo 19's native editor and toolbar implementation, which were used to resolve the Google Fonts integration issues.

## 1. Toolbar Lifecycle & Overlay Management
**File:** `d:\odoo19\addons\html_editor\static\src\main\toolbar\toolbar_plugin.js`

*   **Dynamic Manifestation (Lines 207-213):** The toolbar is managed by the `overlay` service. It is not a hidden/shown element; it is physically added to and removed from the DOM dynamically.
*   **Destruction Logic (Lines 443-459):** The `closeToolbar` method is called frequently (on scroll, on click-away, on selection loss). This explains why persistent panels attached directly to the toolbar were being deleted.
*   **Overlay Protection (Lines 451-453):** Odoo checks for the attribute `[data-prevent-closing-overlay="true"]` on the click target. If present, it prevents the editor from closing the toolbar.

## 2. Global Dropdown Behavior
**File:** `d:\odoo19\addons\web\static\src\core\dropdown\dropdown.js`

*   **Click-Away Logic (Line 153):** Defines how Odoo components handle "outside clicks."
*   **Separate Context (Lines 322-341):** Dropdowns often use the `popover` service which renders them in a different DOM layer to prevent `overflow: hidden` clipping issues from parent containers.

## 3. Editor Core & Plugin Sync
**File:** `d:\odoo19\addons\html_editor\static\src\editor.js`

*   **Initialization (Lines 122-163):** Shows how Odoo sets up the `odoo-editor-editable` area and enforces `contenteditable`.
*   **Plugin Architecture (Lines 196-202):** Plugins are started in a specific sequence. For Google Fonts to work natively, it should ideally be registered in the `web_editor/plugins` or `html_editor/plugins` category.

## 4. Website Builder Presence
**File:** `d:\odoo19\addons\website\static\src\client_actions\website_preview\website_builder_action.js`

*   **Builder Mode Detection (Lines 185-204):** The body class `o_builder_open` is the official state indicator for the Website Builder's edit mode.
*   **Iframe Interactions (Lines 437-448):** Captures and prevents default click behaviors inside the preview iframe to stop navigation while editing.
