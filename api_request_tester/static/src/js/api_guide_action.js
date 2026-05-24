/** @odoo-module **/

import { Component, useState } from "@odoo/owl";
import { registry } from "@web/core/registry";

export class ApiGuideAction extends Component {
    static template = "api_request_tester.Guide";

    setup() {
        this.state = useState({
            activeSection: "getting-started",
        });
    }

    setSection(section) {
        this.state.activeSection = section;
    }
}

registry.category("actions").add("api_request_tester.guide", ApiGuideAction);
