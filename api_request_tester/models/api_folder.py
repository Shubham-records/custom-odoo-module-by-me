# -*- coding: utf-8 -*-
import json
import logging
from odoo import models, fields, api

_logger = logging.getLogger(__name__)


class ApiRequestFolder(models.Model):
    _name = 'api.request.folder'
    _description = 'API Request Folder'
    _order = 'sequence, name'
    _parent_name = 'parent_id'
    _parent_store = True

    name = fields.Char(string='Folder Name', required=True)
    collection_id = fields.Many2one(
        'api.request.collection', string='Collection',
        required=True, ondelete='cascade',
    )
    parent_id = fields.Many2one(
        'api.request.folder', string='Parent Folder',
        ondelete='cascade', index=True,
    )
    parent_path = fields.Char(index=True, unaccent=False)
    child_ids = fields.One2many('api.request.folder', 'parent_id', string='Sub-folders')
    item_ids = fields.One2many('api.request.item', 'folder_id', string='Requests')
    sequence = fields.Integer(default=10)

    @api.model
    def get_tree_data(self, collection_id):
        """Returns the full folder tree for a collection with items."""
        folders = self.search_read(
            [('collection_id', '=', collection_id)],
            ['name', 'parent_id', 'sequence'],
            order='sequence, name',
        )
        items = self.env['api.request.item'].search_read(
            [('collection_id', '=', collection_id)],
            ['name', 'method', 'url', 'folder_id', 'sequence'],
            order='sequence, name',
        )
        return {'folders': folders, 'items': items}
