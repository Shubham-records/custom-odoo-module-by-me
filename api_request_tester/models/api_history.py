# -*- coding: utf-8 -*-
from odoo import models, fields, api


class ApiHistory(models.Model):
    _name = 'api.request.history'
    _description = 'API Request History'
    _order = 'create_date desc'

    url = fields.Char(string='URL', required=True)
    method = fields.Char(string='Method', required=True)
    request_headers = fields.Text(string='Request Headers')
    request_body = fields.Text(string='Request Body')

    status_code = fields.Integer(string='Status Code')
    status_text = fields.Char(string='Status Text')
    response_headers = fields.Text(string='Response Headers')
    response_body = fields.Text(string='Response Body')

    time_elapsed = fields.Float(string='Time (s)')
    response_size = fields.Integer(string='Response Size (bytes)')

    assertion_results = fields.Text(string='Assertion Results (JSON)')
    active = fields.Boolean(string='Active', default=True)

    item_id = fields.Many2one('api.request.item', string='Saved Request', ondelete='set null')
    collection_id = fields.Many2one(
        'api.request.collection', string='Collection',
        related='item_id.collection_id', store=True,
    )
