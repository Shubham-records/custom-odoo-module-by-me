/** @odoo-module **/

import { Component } from "@odoo/owl";

export class AuthEditor extends Component {
    static template = "api_request_tester.AuthEditor";
    static props = {
        state: { type: Object },
    };

    get authTypes() {
        return [
            { value: 'none', label: 'No Auth' },
            { value: 'bearer', label: 'Bearer Token' },
            { value: 'basic', label: 'Basic Auth' },
            { value: 'api_key', label: 'API Key' },
        ];
    }

    onAuthTypeChange(ev) {
        this.props.state.authType = ev.target.value;
        this.props.state.authConfig = {};
    }

    setAuthConfig(key, ev) {
        if (!this.props.state.authConfig) {
            this.props.state.authConfig = {};
        }
        this.props.state.authConfig[key] = ev.target.value;
    }
}
