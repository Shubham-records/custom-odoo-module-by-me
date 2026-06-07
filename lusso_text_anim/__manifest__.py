# -*- coding: utf-8 -*-
{
    'name': 'Lusso Text Animation Snippets',
    'version': '19.0.1.0.0',
    'category': 'Website',
    'summary': 'Premium on-scroll GSAP text animation blocks for Odoo Website Builder',
    'description': """
        Two premium animated text snippet blocks:
        - Type A: Character-by-character tumble/fall animation (scroll-triggered)
        - Type B: Word-level slide-in with rotation (scroll-triggered)
        Both support n-number of text rows with configurable alignment
        (left/center/right) via the Odoo Website Editor sidebar.
    """,
    'author': 'shubham kumar pal',
    'website': 'https://github.com/Shubham-records',
    'depends': ['website'],
    'data': [
        'views/snippets.xml',
        # snippet_options.xml intentionally empty — options are JS-only in Odoo 19
        'views/snippet_options.xml',
    ],
    'assets': {
        # Frontend: animation engine loaded for all visitors
        'web.assets_frontend': [
            'lusso_text_anim/static/src/css/text_anim.css',
            'lusso_text_anim/static/src/js/text_anim.js',
        ],
        # Wysiwyg: option panel controls, loaded only inside the Website Editor
        'website.assets_wysiwyg': [
            'lusso_text_anim/static/src/js/text_anim_options.js',
        ],
    },
    'installable': True,
    'auto_install': False,
    'license': 'LGPL-3',
}
