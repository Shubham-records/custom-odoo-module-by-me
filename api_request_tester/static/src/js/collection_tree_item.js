/** @odoo-module **/

import { Component, useState } from "@odoo/owl";

export class CollectionTreeItem extends Component {
    static template = "api_request_tester.CollectionTreeItem";
    static components = { CollectionTreeItem };
    static props = {
        node: { type: Object },
        childFolders: { type: Array, optional: true },
        childItems: { type: Array, optional: true },
        allFolders: { type: Array },
        allItems: { type: Array },
        activeItemId: { type: [Number, { value: null }], optional: true },
        onSelectItem: { type: Function },
        onDeleteItem: { type: Function, optional: true },
        onDeleteFolder: { type: Function, optional: true },
        onDeleteCollection: { type: Function, optional: true },
        nodeType: { type: String },  // 'collection', 'folder', 'item'
        level: { type: Number, optional: true },
    };
    static defaultProps = {
        childFolders: [],
        childItems: [],
        level: 0,
    };

    setup() {
        this.localState = useState({ expanded: this.props.nodeType === 'collection' });
    }

    toggle() {
        if (this.props.nodeType !== 'item') {
            this.localState.expanded = !this.localState.expanded;
        }
    }

    onSelect() {
        if (this.props.nodeType === 'item') {
            this.props.onSelectItem(this.props.node);
        } else {
            this.toggle();
        }
    }

    getChildFolders(parentId) {
        return this.props.allFolders.filter(f => {
            const pid = f.parent_id;
            const pval = Array.isArray(pid) ? pid[0] : pid;
            return pval === parentId;
        });
    }

    getChildItems(folderId) {
        return this.props.allItems.filter(item => {
            const fid = item.folder_id;
            const fval = Array.isArray(fid) ? fid[0] : fid;
            return fval === folderId;
        });
    }

    getRootItems() {
        return this.props.allItems.filter(item => !item.folder_id);
    }

    get icon() {
        if (this.props.nodeType === 'collection') {
            return this.localState.expanded ? 'fa-folder-open text-warning' : 'fa-folder text-warning';
        }
        if (this.props.nodeType === 'folder') {
            return this.localState.expanded ? 'fa-folder-open-o' : 'fa-folder-o';
        }
        return '';
    }

    get methodClass() {
        if (this.props.nodeType === 'item') {
            return 'method-' + (this.props.node.method || 'get').toLowerCase();
        }
        return '';
    }

    onDeleteClick(ev) {
        ev.stopPropagation();
        if (this.props.nodeType === 'item' && this.props.onDeleteItem) {
            this.props.onDeleteItem(this.props.node.id);
        } else if (this.props.nodeType === 'folder' && this.props.onDeleteFolder) {
            this.props.onDeleteFolder(this.props.node.id);
        } else if (this.props.nodeType === 'collection' && this.props.onDeleteCollection) {
            this.props.onDeleteCollection(this.props.node.id);
        }
    }
}
