# -*- coding: utf-8 -*-
from odoo import models, fields, api

class ApiEnvironment(models.Model):
    _name = 'api.request.environment'
    _description = 'API Request Environment'
    _order = 'name'

    name = fields.Char(string='Name', required=True)
    variable_ids = fields.One2many('api.request.environment.variable', 'environment_id', string='Variables')
    active = fields.Boolean(default=True)

class ApiEnvironmentVariable(models.Model):
    _name = 'api.request.environment.variable'
    _description = 'API Environment Variable'

    environment_id = fields.Many2one('api.request.environment', string='Environment', ondelete='cascade', required=True)
    key = fields.Char(string='Variable Name', required=True)
    value = fields.Char(string='Value')
    variable_type = fields.Selection([
        ('text', 'Text'),
        ('secret', 'Secret'),
    ], default='text', string='Type')
