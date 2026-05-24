# -*- coding: utf-8 -*-
import json
import logging
from odoo import models, fields, api

_logger = logging.getLogger(__name__)


class ApiCollection(models.Model):
    _name = 'api.request.collection'
    _description = 'API Request Collection'
    _order = 'name'

    name = fields.Char(string='Name', required=True)
    description = fields.Text(string='Description')
    item_ids = fields.One2many('api.request.item', 'collection_id', string='Requests')
    folder_ids = fields.One2many('api.request.folder', 'collection_id', string='Folders')
    active = fields.Boolean(default=True)
    color = fields.Integer(string='Color Index')
    item_count = fields.Integer(compute='_compute_item_count', string='Request Count')
    user_id = fields.Many2one('res.users', string='Owner', default=lambda self: self.env.user, required=True)
    shared_user_ids = fields.Many2many(
        'res.users', 'api_collection_shared_user_rel',
        'collection_id', 'user_id', string='Shared Users',
    )

    @api.depends('item_ids')
    def _compute_item_count(self):
        for rec in self:
            rec.item_count = len(rec.item_ids)

    @api.model
    def get_collections_with_tree(self):
        """Returns all collections with their folder trees and items for the OWL sidebar."""
        collections = self.search([])
        result = []
        for col in collections:
            is_shared = col.user_id and col.user_id != self.env.user
            display_name = col.name
            if is_shared:
                display_name = f"{col.name} by {col.user_id.name}"

            col_data = {
                'id': col.id,
                'name': display_name,
                'description': col.description,
                'color': col.color,
                'user_id': col.user_id.id,
            }
            tree_data = self.env['api.request.folder'].get_tree_data(col.id)
            col_data['folders'] = tree_data['folders']
            col_data['items'] = tree_data['items']
            result.append(col_data)
        return result


class ApiRequestItem(models.Model):
    _name = 'api.request.item'
    _description = 'API Request Item'
    _order = 'sequence, id'

    name = fields.Char(string='Request Name', required=True)
    collection_id = fields.Many2one(
        'api.request.collection', string='Collection',
        ondelete='cascade', required=True,
    )
    folder_id = fields.Many2one(
        'api.request.folder', string='Folder', ondelete='set null',
    )
    sequence = fields.Integer(default=10)

    url = fields.Char(string='URL', required=True)
    method = fields.Selection([
        ('GET', 'GET'), ('POST', 'POST'), ('PUT', 'PUT'),
        ('DELETE', 'DELETE'), ('PATCH', 'PATCH'),
        ('HEAD', 'HEAD'), ('OPTIONS', 'OPTIONS'),
    ], default='GET', required=True)

    # Query Params stored as JSON array: [{key, value, enabled}]
    query_params = fields.Text(string='Query Parameters (JSON)')

    # Headers stored as JSON array: [{key, value, enabled}]
    headers = fields.Text(string='Headers (JSON)')

    # Body
    body_type = fields.Selection([
        ('none', 'None'), ('raw', 'Raw'), ('json', 'JSON'),
        ('form_data', 'Form Data'), ('urlencoded', 'URL Encoded'),
        ('graphql', 'GraphQL'),
    ], default='none', string='Body Type')
    body = fields.Text(string='Request Body')
    body_content_type = fields.Selection([
        ('text/plain', 'Text'),
        ('application/json', 'JSON'),
        ('application/xml', 'XML'),
        ('text/html', 'HTML'),
        ('application/javascript', 'JavaScript'),
    ], default='application/json', string='Content Type')

    # Auth
    auth_type = fields.Selection([
        ('none', 'No Auth'), ('bearer', 'Bearer Token'),
        ('basic', 'Basic Auth'), ('api_key', 'API Key'),
    ], default='none', string='Auth Type')
    auth_config = fields.Text(string='Auth Configuration (JSON)')

    # Scripts & Tests
    pre_request_script = fields.Text(string='Pre-request Script')
    assertions = fields.Text(string='Assertions (JSON)')

    scheduled_test = fields.Boolean(string='Scheduled Test', default=False)
    active = fields.Boolean(string='Active', default=True)

    def unlink(self):
        # Archive all associated request history logs when deleting the saved curl/request
        history_records = self.env['api.request.history'].search([('item_id', 'in', self.ids)])
        if history_records:
            history_records.write({'active': False})
        return super(ApiRequestItem, self).unlink()

    def run_test(self):
        """Executes the request and returns the result."""
        tester = self.env['api.request.tester']
        headers_list = []
        if self.headers:
            try:
                headers_list = json.loads(self.headers)
            except (json.JSONDecodeError, TypeError):
                headers_list = []
        return tester.execute_request(
            url=self.url,
            method=self.method,
            headers=headers_list,
            body=self.body,
            body_type=self.body_type or 'none',
            auth_type=self.auth_type or 'none',
            auth_config=self.auth_config,
            pre_request_script=self.pre_request_script,
            assertions=self.assertions,
            item_id=self.id,
        )

    @api.model
    def run_scheduled_tests(self):
        """Method to be called by cron for scheduled tests."""
        items = self.search([('scheduled_test', '=', True)])
        for item in items:
            try:
                item.run_test()
            except Exception as e:
                _logger.error("Scheduled test failed for %s: %s", item.name, str(e))
