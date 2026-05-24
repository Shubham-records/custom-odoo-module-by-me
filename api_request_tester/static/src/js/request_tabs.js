/** @odoo-module **/

import { Component } from "@odoo/owl";
import { KeyValueEditor } from "./key_value_editor";
import { BodyEditor } from "./body_editor";
import { AuthEditor } from "./auth_editor";

export class RequestTabs extends Component {
    static template = "api_request_tester.RequestTabs";
    static components = { KeyValueEditor, BodyEditor, AuthEditor };
    static props = {
        state: { type: Object },
    };

    get tabs() {
        return [
            { id: 'params', label: 'Params', icon: 'fa-question-circle' },
            { id: 'headers', label: 'Headers', icon: 'fa-list' },
            { id: 'body', label: 'Body', icon: 'fa-file-text-o' },
            { id: 'auth', label: 'Auth', icon: 'fa-lock' },
            { id: 'scripts', label: 'Pre-request', icon: 'fa-code' },
            { id: 'assertions', label: 'Tests', icon: 'fa-check-square-o' },
        ];
    }
}
