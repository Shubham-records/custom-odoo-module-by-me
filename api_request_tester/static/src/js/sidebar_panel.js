/** @odoo-module **/

import { Component } from "@odoo/owl";
import { CollectionTreeItem } from "./collection_tree_item";

export class SidebarPanel extends Component {
    static template = "api_request_tester.SidebarPanel";
    static components = { CollectionTreeItem };
    static props = {
        state: { type: Object },
        onSelectItem: { type: Function },
        onLoadHistory: { type: Function },
        onCreateCollection: { type: Function },
        onCreateFolder: { type: Function },
        onDeleteItem: { type: Function },
        onDeleteFolder: { type: Function },
        onDeleteCollection: { type: Function },
    };

    get filteredHistory() {
        const q = (this.props.state.sidebarSearch || '').toLowerCase();
        if (!q) return this.props.state.history;
        return this.props.state.history.filter(h =>
            (h.url || '').toLowerCase().includes(q) ||
            (h.method || '').toLowerCase().includes(q)
        );
    }

    get filteredCollections() {
        const q = (this.props.state.sidebarSearch || '').toLowerCase();
        if (!q) return this.props.state.collections;
        return this.props.state.collections.filter(c =>
            (c.name || '').toLowerCase().includes(q)
        );
    }

    getMethodClass(method) {
        return 'method-' + (method || 'get').toLowerCase();
    }

    getStatusClass(code) {
        return code < 300 ? 'success' : 'error';
    }

    formatTime(dateStr) {
        if (!dateStr) return '';
        try {
            const parts = dateStr.split(' ');
            return parts[1] ? parts[1].substring(0, 5) : dateStr;
        } catch {
            return dateStr;
        }
    }
}
