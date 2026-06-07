{
    'name': 'Website Google Fonts Picker',
    'version': '1.0.7',
    'summary': 'Google Fonts selector in Website Editor toolbar',
    'category': 'Website',
    'depends': ['website'],
    'author': 'shubham kumar pal',
    'website': 'https://github.com/Shubham-records',
    'data': [
        'security/ir.model.access.csv',
        'data/google_font_data.xml',
        'views/google_font_views.xml',
        'views/assets.xml',
    ],
    'assets': {
        'web.assets_backend': [
            'google_fonts_website/static/src/css/font_picker.css',
            'google_fonts_website/static/src/js/font_picker.js',
        ],
        'web.assets_frontend': [
            'google_fonts_website/static/src/css/font_picker.css',
        ],
    },
    'installable': True,
    'license': 'LGPL-3',
}
