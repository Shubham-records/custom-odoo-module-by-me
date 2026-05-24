/** @odoo-module **/

import { Component } from "@odoo/owl";

export class ResponsePanel extends Component {
    static template = "api_request_tester.ResponsePanel";
    static props = {
        state: { type: Object },
    };

    get statusClass() {
        const code = this.props.state.response?.status_code || 0;
        if (code >= 200 && code < 300) return 'status-2xx';
        if (code >= 300 && code < 400) return 'status-3xx';
        if (code >= 400 && code < 500) return 'status-4xx';
        return 'status-5xx';
    }

    get responseTime() {
        const t = this.props.state.response?.time;
        if (!t) return '0';
        return (t * 1000).toFixed(0);
    }

    get responseSize() {
        const s = this.props.state.response?.size || 0;
        if (s < 1024) return s + ' B';
        if (s < 1024 * 1024) return (s / 1024).toFixed(1) + ' KB';
        return (s / (1024 * 1024)).toFixed(1) + ' MB';
    }

    get responseHeaderEntries() {
        const headers = this.props.state.response?.headers;
        if (!headers) return [];
        return Object.entries(headers);
    }

    get assertionResults() {
        return this.props.state.response?.assertions || [];
    }

    get hasAssertions() {
        return this.assertionResults.length > 0;
    }

    copyResponse() {
        const body = this.props.state.response?.body || '';
        if (navigator.clipboard) {
            navigator.clipboard.writeText(body);
        }
    }
}
