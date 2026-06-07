# -*- coding: utf-8 -*-
{
    'name': 'Lusso Website Snippets',
    'version': '19.0.1.0.0',
    'summary': 'Premium furniture website snippets with GSAP animations and multiple themes',
    'description': """
        Lusso Website Snippets for Odoo Website Builder.
        Includes:
        - Hero sections (Light, Dark, Warm, Forest themes)
        - Curated Collections grids
        - Craftsmanship / Philosophy sections
        - Newsletter / Inner Circle sections
        - Stats & Social Proof banners
        All snippets include GSAP scroll-triggered animations and custom Google Fonts.
    """,
    'author': 'shubham kumar pal',
    'website': 'https://github.com/Shubham-records',
    'category': 'Website',
    'depends': ['website'],
    'data': [
        'views/assets.xml',
        'views/snippets.xml',
    ],
    'assets': {
        'web.assets_frontend': [
            'lusso_website_snippets/static/src/css/lusso_snippets.css',
        ],
        'web.assets_frontend_lazy': [
            'lusso_website_snippets/static/src/js/lusso_snippets.js',
        ],
    },
    'installable': True,
    'application': False,
    'auto_install': False,
    'license': 'LGPL-3',
}
