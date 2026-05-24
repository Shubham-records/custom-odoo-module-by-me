/** @odoo-module **/

import { Component } from "@odoo/owl";

export class KeyValueEditor extends Component {
    static template = "api_request_tester.KeyValueEditor";
    static props = {
        items: { type: Array },
        keyPlaceholder: { type: String, optional: true },
        valuePlaceholder: { type: String, optional: true },
        showDescription: { type: Boolean, optional: true },
    };
    static defaultProps = {
        keyPlaceholder: "Key",
        valuePlaceholder: "Value",
        showDescription: false,
    };

    addRow() {
        this.props.items.push({ key: "", value: "", enabled: true });
    }

    removeRow(index) {
        this.props.items.splice(index, 1);
    }

    toggleRow(index) {
        this.props.items[index].enabled = !this.props.items[index].enabled;
    }
}
