from odoo import models, fields

class GoogleFont(models.Model):
    _name = 'google.font'
    _description = 'Google Font'
    _order = 'sequence, name'

    name = fields.Char(string='Font Name', required=True)
    font_group = fields.Char(string='Group', default='sans-serif', required=True)
    sequence = fields.Integer(default=10)
    active = fields.Boolean(default=True)
