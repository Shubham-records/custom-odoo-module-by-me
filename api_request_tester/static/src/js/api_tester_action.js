/** @odoo-module **/

import { Component, useState, onWillStart } from "@odoo/owl";
import { registry } from "@web/core/registry";
import { useService } from "@web/core/utils/hooks";
import { SidebarPanel } from "./sidebar_panel";
import { RequestTabs } from "./request_tabs";
import { ResponsePanel } from "./response_panel";
import { parseCurl, isCurlCommand } from "./utils/curl_parser";

export class ApiTesterAction extends Component {
    static template = "api_request_tester.Tester";
    static components = { SidebarPanel, RequestTabs, ResponsePanel };

    setup() {
        this.orm = useService("orm");
        this.notification = useService("notification");

        this.state = useState({
            // URL Bar
            url: "https://jsonplaceholder.typicode.com/posts/1",
            method: "GET",

            // Request Config
            headers: [
                { key: "User-Agent", value: "OdooApiTester/2.0", enabled: true },
                { key: "Accept", value: "*/*", enabled: true },
            ],
            queryParams: [{ key: "", value: "", enabled: true }],
            body: "",
            bodyType: "none",
            bodyFormData: [{ key: "", value: "", enabled: true }],
            bodyUrlEncoded: [{ key: "", value: "", enabled: true }],
            bodyGraphqlVars: "",

            // Auth
            authType: "none",
            authConfig: {},

            // Scripts & Tests
            preRequestScript: "",
            assertions: "",

            // Tabs
            activeTab: "params",
            responseTab: "body",

            // Response
            response: null,
            loading: false,

            // Sidebar
            history: [],
            collections: [],
            environments: [],
            selectedEnvId: null,
            showSidebar: true,
            sidebarTab: "collections",
            sidebarSearch: "",

            // Active loaded item
            activeItemId: null,
            activeItemName: "",
            activeItemPath: "",

            // Save dialog
            showSaveDialog: false,
            saveName: "",
            saveCollectionId: null,
            saveFolderId: null,

            // Custom Modals
            showCreateCollectionModal: false,
            newCollectionName: "",
            showCreateFolderModal: false,
            newFolderName: "",
            newFolderCollectionId: null,
            newFolderParentId: null,

            // Confirm Modal
            showConfirmModal: false,
            confirmTitle: "",
            confirmMessage: "",
            confirmData: null,
        });

        onWillStart(async () => {
            await this.loadInitialData();
        });
    }

    // -------------------------------------------------------------------------
    // Data Loading
    // -------------------------------------------------------------------------
    async loadInitialData() {
        try {
            const [history, collections, environments] = await Promise.all([
                this.orm.searchRead("api.request.history", [], ["method", "url", "status_code", "create_date"], { limit: 50, order: "create_date desc" }),
                this.orm.call("api.request.collection", "get_collections_with_tree", []),
                this.orm.searchRead("api.request.environment", [], ["name"]),
            ]);
            this.state.history = history;
            this.state.collections = collections;
            this.state.environments = environments;
        } catch (error) {
            console.error("Failed to load initial data:", error);
        }
    }

    async refreshHistory() {
        this.state.history = await this.orm.searchRead(
            "api.request.history", [], ["method", "url", "status_code", "create_date"],
            { limit: 50, order: "create_date desc" },
        );
    }

    async refreshCollections() {
        this.state.collections = await this.orm.call("api.request.collection", "get_collections_with_tree", []);
    }

    // -------------------------------------------------------------------------
    // URL Bar — cURL Detection
    // -------------------------------------------------------------------------
    onUrlPaste(ev) {
        const val = ev.clipboardData ? ev.clipboardData.getData("text") : "";
        if (isCurlCommand(val)) {
            ev.preventDefault();
            const parsed = parseCurl(val);
            if (parsed && parsed.url) {
                this.state.url = parsed.url;
                this.state.method = parsed.method;
                if (parsed.headers.length) {
                    this.state.headers = [...parsed.headers, ...this.state.headers];
                }
                if (parsed.body) {
                    this.state.body = parsed.body;
                }
                if (parsed.bodyType) {
                    this.state.bodyType = parsed.bodyType;
                    this.state.activeTab = "body";
                    if (parsed.bodyType === "urlencoded" && parsed.bodyParams.length) {
                        this.state.bodyUrlEncoded = parsed.bodyParams;
                    } else if (parsed.bodyType === "form_data" && parsed.bodyParams.length) {
                        this.state.bodyFormData = parsed.bodyParams;
                    }
                }
                if (parsed.authType !== "none") {
                    this.state.authType = parsed.authType;
                    this.state.authConfig = parsed.authConfig;
                }
                this.notification.add("cURL command parsed successfully!", { type: "success" });
            }
        }
    }

    // -------------------------------------------------------------------------
    // Send Request
    // -------------------------------------------------------------------------
    getMethodClass(method) {
        return "method-" + (method || "get").toLowerCase();
    }

    async onSend() {
        if (!this.state.url) {
            this.notification.add("Please enter a URL", { type: "danger" });
            return;
        }

        this.state.loading = true;
        this.state.response = null;
        this.state.responseTab = "body";

        try {
            // Build body based on type
            let bodyToSend = this.state.body;
            if (this.state.bodyType === "form_data") {
                bodyToSend = JSON.stringify(this.state.bodyFormData.filter(i => i.key && i.enabled));
            } else if (this.state.bodyType === "urlencoded") {
                bodyToSend = JSON.stringify(this.state.bodyUrlEncoded.filter(i => i.key && i.enabled));
            } else if (this.state.bodyType === "graphql") {
                bodyToSend = JSON.stringify({
                    query: this.state.body,
                    variables: this.state.bodyGraphqlVars ? JSON.parse(this.state.bodyGraphqlVars) : {},
                });
            }

            // Build auth config
            let authConfigStr = this.state.authConfig;
            if (typeof authConfigStr === "object") {
                authConfigStr = JSON.stringify(authConfigStr);
            }

            const result = await this.orm.call("api.request.tester", "execute_request", [], {
                url: this.state.url,
                method: this.state.method,
                headers: this.state.headers.filter(h => h.key && h.enabled),
                body: bodyToSend,
                body_type: this.state.bodyType,
                auth_type: this.state.authType,
                auth_config: authConfigStr,
                pre_request_script: this.state.preRequestScript,
                assertions: this.state.assertions,
                environment_id: this.state.selectedEnvId,
            });

            this.state.response = result;
            if (result.error) {
                this.notification.add(`Error: ${result.error}`, { type: "danger" });
            }
            await this.refreshHistory();
        } catch (error) {
            console.error("RPC Error", error);
            this.notification.add("Failed to communicate with server", { type: "danger" });
        } finally {
            this.state.loading = false;
        }
    }

    // -------------------------------------------------------------------------
    // History
    // -------------------------------------------------------------------------
    async onLoadHistory(item) {
        const fullItem = await this.orm.read("api.request.history", [item.id], [
            "method", "url", "request_headers", "request_body",
        ]);
        const data = fullItem[0];
        this.state.method = data.method;
        this.state.url = data.url;
        this.state.body = data.request_body || "";
        this.state.activeItemId = null;
        this.state.activeItemName = "";
        try {
            const headers = JSON.parse(data.request_headers || "{}");
            this.state.headers = Object.entries(headers).map(([k, v]) => ({
                key: k, value: v, enabled: true,
            }));
        } catch {
            // Keep current headers
        }
    }

    // -------------------------------------------------------------------------
    // Collection Item Loading
    // -------------------------------------------------------------------------
    async onSelectItem(item) {
        const fullItems = await this.orm.read("api.request.item", [item.id], [
            "name", "method", "url", "headers", "body", "body_type",
            "auth_type", "auth_config", "query_params",
            "pre_request_script", "assertions", "collection_id", "folder_id",
        ]);
        const data = fullItems[0];
        this.state.method = data.method;
        this.state.url = data.url;
        this.state.body = data.body || "";
        this.state.bodyType = data.body_type || "none";
        this.state.authType = data.auth_type || "none";
        this.state.preRequestScript = data.pre_request_script || "";
        this.state.assertions = data.assertions || "";
        this.state.activeItemId = item.id;
        this.state.activeItemName = data.name;
        this.state.activeItemPath = this.computeActiveItemPath(item.id, data.name);

        // Parse headers
        try {
            const h = JSON.parse(data.headers || "[]");
            this.state.headers = Array.isArray(h) ? h : Object.entries(h).map(([k, v]) => ({ key: k, value: v, enabled: true }));
        } catch { /* keep */ }

        // Parse auth config
        try {
            this.state.authConfig = JSON.parse(data.auth_config || "{}");
        } catch { this.state.authConfig = {}; }

        // Parse query params
        try {
            const qp = JSON.parse(data.query_params || "[]");
            this.state.queryParams = Array.isArray(qp) && qp.length ? qp : [{ key: "", value: "", enabled: true }];
        } catch { this.state.queryParams = [{ key: "", value: "", enabled: true }]; }
    }

    // -------------------------------------------------------------------------
    // Save Dialog
    // -------------------------------------------------------------------------
    openSaveDialog() {
        this.state.saveName = this.state.activeItemName || "New Request";
        this.state.saveCollectionId = this.state.collections.length ? this.state.collections[0].id : null;
        this.state.saveFolderId = null;
        this.state.showSaveDialog = true;
    }

    closeSaveDialog() {
        this.state.showSaveDialog = false;
    }

    async onSaveRequest() {
        if (!this.state.saveName || !this.state.saveCollectionId) {
            this.notification.add("Please enter a name and select a collection", { type: "warning" });
            return;
        }

        const vals = {
            name: this.state.saveName,
            collection_id: parseInt(this.state.saveCollectionId),
            folder_id: this.state.saveFolderId ? parseInt(this.state.saveFolderId) : false,
            url: this.state.url,
            method: this.state.method,
            headers: JSON.stringify(this.state.headers),
            body: this.state.body,
            body_type: this.state.bodyType,
            auth_type: this.state.authType,
            auth_config: JSON.stringify(this.state.authConfig),
            query_params: JSON.stringify(this.state.queryParams),
            pre_request_script: this.state.preRequestScript,
            assertions: this.state.assertions,
        };

        try {
            if (this.state.activeItemId) {
                // Update existing
                await this.orm.write("api.request.item", [this.state.activeItemId], vals);
                this.notification.add("Request updated!", { type: "success" });
            } else {
                // Create new
                const newId = await this.orm.create("api.request.item", [vals]);
                this.state.activeItemId = newId[0];
                this.state.activeItemName = this.state.saveName;
                this.notification.add("Request saved!", { type: "success" });
            }
            this.state.showSaveDialog = false;
            await this.refreshCollections();
            this.state.activeItemPath = this.computeActiveItemPath(this.state.activeItemId, this.state.activeItemName);
        } catch (error) {
            console.error("Save error:", error);
            this.notification.add("Failed to save request", { type: "danger" });
        }
    }

    async onQuickSave() {
        if (this.state.activeItemId) {
            // Quick update existing item
            const vals = {
                url: this.state.url,
                method: this.state.method,
                headers: JSON.stringify(this.state.headers),
                body: this.state.body,
                body_type: this.state.bodyType,
                auth_type: this.state.authType,
                auth_config: JSON.stringify(this.state.authConfig),
                query_params: JSON.stringify(this.state.queryParams),
                pre_request_script: this.state.preRequestScript,
                assertions: this.state.assertions,
            };
            await this.orm.write("api.request.item", [this.state.activeItemId], vals);
            this.notification.add("Saved!", { type: "success" });
            await this.refreshCollections();
        } else {
            this.openSaveDialog();
        }
    }

    // -------------------------------------------------------------------------
    // CRUD — Collections & Folders
    // -------------------------------------------------------------------------
    onCreateCollection() {
        this.state.newCollectionName = "";
        this.state.showCreateCollectionModal = true;
    }

    closeCreateCollectionModal() {
        this.state.showCreateCollectionModal = false;
    }

    async submitCreateCollection() {
        const name = this.state.newCollectionName ? this.state.newCollectionName.trim() : "";
        if (!name) {
            this.notification.add("Please enter a collection name", { type: "warning" });
            return;
        }
        await this.orm.create("api.request.collection", [{ name }]);
        await this.refreshCollections();
        this.state.showCreateCollectionModal = false;
        this.notification.add(`Collection "${name}" created`, { type: "success" });
    }

    onCreateFolder() {
        if (!this.state.collections.length) {
            this.notification.add("Create a collection first", { type: "warning" });
            return;
        }
        this.state.newFolderName = "";
        this.state.newFolderCollectionId = this.state.collections[0].id;
        this.state.newFolderParentId = null;
        this.state.showCreateFolderModal = true;
    }

    closeCreateFolderModal() {
        this.state.showCreateFolderModal = false;
    }

    async submitCreateFolder() {
        const name = this.state.newFolderName ? this.state.newFolderName.trim() : "";
        const colId = this.state.newFolderCollectionId;
        if (!name || !colId) {
            this.notification.add("Please enter a folder name and select a collection", { type: "warning" });
            return;
        }
        const vals = {
            name,
            collection_id: parseInt(colId),
            parent_id: this.state.newFolderParentId ? parseInt(this.state.newFolderParentId) : false,
        };
        await this.orm.create("api.request.folder", [vals]);
        await this.refreshCollections();
        this.state.showCreateFolderModal = false;
        this.notification.add(`Folder "${name}" created`, { type: "success" });
    }

    getFoldersForCollection(colId) {
        if (!colId) return [];
        const collection = this.state.collections.find(c => c.id === parseInt(colId));
        if (!collection || !collection.folders) return [];

        const folders = collection.folders;
        const folderMap = {};
        for (const f of folders) {
            folderMap[f.id] = f;
        }

        const getPath = (f) => {
            const path = [f.name];
            let current = f;
            while (current.parent_id) {
                const pid = Array.isArray(current.parent_id) ? current.parent_id[0] : current.parent_id;
                const parent = folderMap[pid];
                if (parent) {
                    path.unshift(parent.name);
                    current = parent;
                } else {
                    break;
                }
            }
            return path.join(" / ");
        };

        return folders.map(f => ({
            id: f.id,
            name: f.name,
            path: getPath(f),
        })).sort((a, b) => a.path.localeCompare(b.path));
    }

    // -------------------------------------------------------------------------
    // Confirm Dialog
    // -------------------------------------------------------------------------
    triggerConfirm(title, message, data) {
        this.state.confirmTitle = title;
        this.state.confirmMessage = message;
        this.state.confirmData = data;
        this.state.showConfirmModal = true;
    }

    closeConfirmModal() {
        this.state.showConfirmModal = false;
        this.state.confirmData = null;
    }

    async submitConfirmAction() {
        const data = this.state.confirmData;
        if (!data) return;

        this.state.showConfirmModal = false;
        this.state.confirmData = null;

        try {
            if (data.type === 'item') {
                await this.orm.unlink("api.request.item", [data.id]);
                if (this.state.activeItemId === data.id) {
                    this.state.activeItemId = null;
                    this.state.activeItemName = "";
                }
                await this.refreshCollections();
                this.notification.add("Request deleted", { type: "info" });
            } else if (data.type === 'folder') {
                await this.orm.unlink("api.request.folder", [data.id]);
                await this.refreshCollections();
                this.notification.add("Folder deleted", { type: "info" });
            } else if (data.type === 'collection') {
                await this.orm.unlink("api.request.collection", [data.id]);
                await this.refreshCollections();
                if (this.state.activeItemId) {
                    const stillExists = this.state.collections.some(c => c.items && c.items.some(i => i.id === this.state.activeItemId));
                    if (!stillExists) {
                        this.state.activeItemId = null;
                        this.state.activeItemName = "";
                    }
                }
                this.notification.add("Collection deleted", { type: "info" });
            }
        } catch (error) {
            console.error("Delete failed:", error);
            this.notification.add("Failed to delete item", { type: "danger" });
        }
    }

    onDeleteItem(itemId) {
        this.triggerConfirm(
            "Delete Request",
            "Are you sure you want to delete this request?",
            { type: "item", id: itemId }
        );
    }

    onDeleteFolder(folderId) {
        this.triggerConfirm(
            "Delete Folder",
            "Are you sure you want to delete this folder and all of its contents?",
            { type: "folder", id: folderId }
        );
    }

    onDeleteCollection(collectionId) {
        this.triggerConfirm(
            "Delete Collection",
            "Are you sure you want to delete this collection and all its folders & requests?",
            { type: "collection", id: collectionId }
        );
    }

    computeActiveItemPath(itemId, itemName) {
        if (!itemId || !this.state.collections) return itemName || "";
        for (const col of this.state.collections) {
            // Direct items in collection
            if (col.items && col.items.some(i => i.id === itemId)) {
                return `${col.name} / ${itemName}`;
            }
            // Items in folders
            if (col.folders) {
                for (const f of col.folders) {
                    if (f.items && f.items.some(i => i.id === itemId)) {
                        return `${col.name} / ${f.name} / ${itemName}`;
                    }
                }
            }
        }
        return itemName || "";
    }

    // -------------------------------------------------------------------------
    // Sidebar Toggle
    // -------------------------------------------------------------------------
    toggleSidebar() {
        this.state.showSidebar = !this.state.showSidebar;
    }

    // -------------------------------------------------------------------------
    // New Request (reset)
    // -------------------------------------------------------------------------
    newRequest() {
        this.state.url = "";
        this.state.method = "GET";
        this.state.headers = [
            { key: "User-Agent", value: "OdooApiTester/2.0", enabled: true },
            { key: "Accept", value: "*/*", enabled: true },
        ];
        this.state.queryParams = [{ key: "", value: "", enabled: true }];
        this.state.body = "";
        this.state.bodyType = "none";
        this.state.bodyFormData = [{ key: "", value: "", enabled: true }];
        this.state.bodyUrlEncoded = [{ key: "", value: "", enabled: true }];
        this.state.bodyGraphqlVars = "";
        this.state.authType = "none";
        this.state.authConfig = {};
        this.state.preRequestScript = "";
        this.state.assertions = "";
        this.state.response = null;
        this.state.activeItemId = null;
        this.state.activeItemName = "";
        this.state.activeItemPath = "";
        this.state.activeTab = "params";
    }
}

ApiTesterAction.template = "api_request_tester.Tester";
registry.category("actions").add("api_request_tester.tester", ApiTesterAction);
