# -*- coding: utf-8 -*-
import requests
import json
import logging
import socket
import shlex
import base64
from urllib.parse import urlencode, parse_qs, urlparse, urlunparse
from odoo import models, fields, api
from odoo.exceptions import UserError

_logger = logging.getLogger(__name__)


class ApiRequest(models.AbstractModel):
    _name = 'api.request.tester'
    _description = 'API Request Tester'

    @api.model
    def get_server_ip(self):
        """Returns the public IP of the server."""
        try:
            response = requests.get('https://api.ipify.org?format=json', timeout=5)
            if response.status_code == 200:
                return response.json().get('ip')
        except Exception:
            try:
                s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
                s.connect(("8.8.8.8", 80))
                ip = s.getsockname()[0]
                s.close()
                return ip
            except Exception:
                return "Unknown"
        return "Unknown"

    # -------------------------------------------------------------------------
    # cURL Parser
    # -------------------------------------------------------------------------
    @api.model
    def parse_curl(self, curl_command):
        """Parse a cURL command string into structured request components."""
        if not curl_command or not isinstance(curl_command, str):
            return {'error': 'Invalid cURL command'}

        curl_command = curl_command.replace('\\\n', ' ').replace('\\\r\n', ' ').strip()
        if curl_command.lower().startswith('curl'):
            curl_command = curl_command[4:].strip()

        try:
            tokens = shlex.split(curl_command)
        except ValueError:
            tokens = curl_command.split()

        result = {
            'url': '', 'method': 'GET', 'headers': [],
            'body': '', 'body_type': 'none',
            'auth_type': 'none', 'auth_config': {},
        }

        i = 0
        while i < len(tokens):
            token = tokens[i]
            if token in ('-X', '--request') and i + 1 < len(tokens):
                result['method'] = tokens[i + 1].upper()
                i += 2
            elif token in ('-H', '--header') and i + 1 < len(tokens):
                header = tokens[i + 1]
                if ':' in header:
                    key, value = header.split(':', 1)
                    result['headers'].append({
                        'key': key.strip(), 'value': value.strip(), 'enabled': True,
                    })
                i += 2
            elif token in ('-d', '--data', '--data-raw', '--data-binary') and i + 1 < len(tokens):
                result['body'] = tokens[i + 1]
                if result['method'] == 'GET':
                    result['method'] = 'POST'
                try:
                    json.loads(result['body'])
                    result['body_type'] = 'json'
                except (json.JSONDecodeError, TypeError):
                    if '=' in result['body']:
                        result['body_type'] = 'urlencoded'
                    else:
                        result['body_type'] = 'raw'
                i += 2
            elif token == '--data-urlencode' and i + 1 < len(tokens):
                result['body'] = (result['body'] + '&' + tokens[i + 1]).lstrip('&')
                result['body_type'] = 'urlencoded'
                if result['method'] == 'GET':
                    result['method'] = 'POST'
                i += 2
            elif token in ('-u', '--user') and i + 1 < len(tokens):
                parts = tokens[i + 1].split(':', 1)
                result['auth_type'] = 'basic'
                result['auth_config'] = {
                    'username': parts[0],
                    'password': parts[1] if len(parts) > 1 else '',
                }
                i += 2
            elif token in ('-b', '--cookie') and i + 1 < len(tokens):
                result['headers'].append({'key': 'Cookie', 'value': tokens[i + 1], 'enabled': True})
                i += 2
            elif token == '--compressed':
                result['headers'].append({'key': 'Accept-Encoding', 'value': 'gzip, deflate, br', 'enabled': True})
                i += 1
            elif token in ('-k', '--insecure', '-L', '--location', '-v', '--verbose', '-s', '--silent', '-S', '--show-error'):
                i += 1
            elif token.startswith('-') and i + 1 < len(tokens) and not tokens[i + 1].startswith('-'):
                i += 2
            elif token.startswith('-'):
                i += 1
            else:
                if not result['url']:
                    result['url'] = token
                i += 1

        # Detect auth from headers
        auth_headers_to_remove = []
        for idx, h in enumerate(result['headers']):
            if h['key'].lower() == 'authorization':
                val = h['value']
                if val.lower().startswith('bearer '):
                    result['auth_type'] = 'bearer'
                    result['auth_config'] = {'token': val[7:]}
                    auth_headers_to_remove.append(idx)
                elif val.lower().startswith('basic '):
                    try:
                        decoded = base64.b64decode(val[6:]).decode()
                        parts = decoded.split(':', 1)
                        result['auth_type'] = 'basic'
                        result['auth_config'] = {
                            'username': parts[0],
                            'password': parts[1] if len(parts) > 1 else '',
                        }
                    except Exception:
                        pass
                    auth_headers_to_remove.append(idx)
                break

        for idx in reversed(auth_headers_to_remove):
            result['headers'].pop(idx)

        return result

    # -------------------------------------------------------------------------
    # Auth Builder
    # -------------------------------------------------------------------------
    def _build_auth_headers(self, auth_type, auth_config, header_dict):
        """Applies authentication to the header dictionary."""
        if not auth_type or auth_type == 'none':
            return header_dict

        config = {}
        if auth_config:
            if isinstance(auth_config, str):
                try:
                    config = json.loads(auth_config)
                except (json.JSONDecodeError, TypeError):
                    config = {}
            elif isinstance(auth_config, dict):
                config = auth_config

        if auth_type == 'bearer':
            token = config.get('token', '')
            if token:
                header_dict['Authorization'] = f'Bearer {token}'

        elif auth_type == 'basic':
            username = config.get('username', '')
            password = config.get('password', '')
            credentials = base64.b64encode(f'{username}:{password}'.encode()).decode()
            header_dict['Authorization'] = f'Basic {credentials}'

        elif auth_type == 'api_key':
            key_name = config.get('key', '')
            key_value = config.get('value', '')
            add_to = config.get('add_to', 'header')
            if add_to == 'header' and key_name:
                header_dict[key_name] = key_value

        return header_dict

    # -------------------------------------------------------------------------
    # Environment Variable Substitution
    # -------------------------------------------------------------------------
    @api.model
    def _substitute_env_vars(self, text, env_id):
        """Replace {{variable}} placeholders with environment values."""
        if not text or not env_id:
            return text
        try:
            env_vars = self.env['api.request.environment.variable'].search_read(
                [('environment_id', '=', int(env_id))], ['key', 'value'],
            )
            for var in env_vars:
                placeholder = '{{' + var['key'] + '}}'
                text = text.replace(placeholder, var['value'] or '')
        except Exception:
            pass
        return text

    # -------------------------------------------------------------------------
    # Main Executor
    # -------------------------------------------------------------------------
    @api.model
    def execute_request(self, url, method, headers=None, body=None,
                        body_type='none', auth_type='none', auth_config=None,
                        pre_request_script=None, assertions=None,
                        item_id=None, environment_id=None):
        """Executes an HTTP request from the server."""

        # Environment variable substitution
        if environment_id:
            url = self._substitute_env_vars(url, environment_id)
            body = self._substitute_env_vars(body, environment_id)

        # Pre-request Script
        script_context = {
            'headers': headers or {}, 'body': body,
            'url': url, 'json': json, 'requests': requests,
        }
        if pre_request_script:
            try:
                exec(pre_request_script, {}, script_context)
                url = script_context.get('url', url)
                headers = script_context.get('headers', headers)
                body = script_context.get('body', body)
            except Exception as e:
                return {'error': f"Pre-request script error: {str(e)}", 'status_code': 0}

        try:
            # Parse headers
            header_dict = {}
            if headers:
                if isinstance(headers, list):
                    for h in headers:
                        if h.get('key') and h.get('enabled', True):
                            val = h.get('value', '')
                            if environment_id:
                                val = self._substitute_env_vars(val, environment_id)
                            header_dict[h['key']] = val
                elif isinstance(headers, dict):
                    header_dict = headers

            # Apply auth
            header_dict = self._build_auth_headers(auth_type, auth_config, header_dict)

            # Build request body based on body_type
            data = None
            if body and method in ('POST', 'PUT', 'PATCH', 'DELETE'):
                if body_type == 'json':
                    try:
                        data = json.dumps(json.loads(body))
                        header_dict.setdefault('Content-Type', 'application/json')
                    except (json.JSONDecodeError, TypeError):
                        data = body
                elif body_type == 'urlencoded':
                    try:
                        pairs = json.loads(body)
                        if isinstance(pairs, list):
                            data = urlencode(
                                [(p['key'], p['value']) for p in pairs if p.get('enabled', True)]
                            )
                        else:
                            data = body
                    except (json.JSONDecodeError, TypeError):
                        data = body
                    header_dict.setdefault('Content-Type', 'application/x-www-form-urlencoded')
                elif body_type == 'form_data':
                    try:
                        pairs = json.loads(body)
                        if isinstance(pairs, list):
                            data = urlencode(
                                [(p['key'], p['value']) for p in pairs if p.get('enabled', True)]
                            )
                        else:
                            data = body
                    except (json.JSONDecodeError, TypeError):
                        data = body
                elif body_type == 'graphql':
                    try:
                        gql = json.loads(body)
                        data = json.dumps({
                            'query': gql.get('query', ''),
                            'variables': gql.get('variables', {}),
                        })
                        header_dict.setdefault('Content-Type', 'application/json')
                    except (json.JSONDecodeError, TypeError):
                        data = json.dumps({'query': body, 'variables': {}})
                        header_dict.setdefault('Content-Type', 'application/json')
                else:
                    # raw or auto-detect
                    try:
                        if body.strip().startswith(('{', '[')):
                            data = json.dumps(json.loads(body))
                            header_dict.setdefault('Content-Type', 'application/json')
                        else:
                            data = body
                    except Exception:
                        data = body

            # Execute request
            response = requests.request(
                method=method, url=url,
                headers=header_dict, data=data, timeout=30,
            )

            # Parse response body
            response_body = response.text
            is_json = False
            try:
                content_type = response.headers.get('Content-Type', '')
                if 'application/json' in content_type:
                    response_body = json.dumps(response.json(), indent=4)
                    is_json = True
            except Exception:
                pass

            # Assertions
            assertion_results = []
            if assertions:
                try:
                    assertion_list = json.loads(assertions) if isinstance(assertions, str) else assertions
                    for ass in assertion_list:
                        res = self._run_assertion(ass, response, is_json)
                        assertion_results.append(res)
                except Exception as e:
                    assertion_results.append({
                        'name': 'Assertion Engine', 'status': 'fail', 'message': str(e),
                    })

            # Save to History
            resp_size = len(response.content) if response.content else 0
            history_vals = {
                'url': url, 'method': method,
                'request_headers': json.dumps(header_dict),
                'request_body': body,
                'status_code': response.status_code,
                'status_text': response.reason,
                'response_headers': json.dumps(dict(response.headers)),
                'response_body': response_body,
                'time_elapsed': response.elapsed.total_seconds(),
                'response_size': resp_size,
                'assertion_results': json.dumps(assertion_results),
                'item_id': item_id,
            }
            self.env['api.request.history'].create(history_vals)

            return {
                'status_code': response.status_code,
                'status_text': response.reason,
                'headers': dict(response.headers),
                'body': response_body,
                'time': response.elapsed.total_seconds(),
                'size': resp_size,
                'assertions': assertion_results,
                'server_ip': self.get_server_ip(),
            }

        except requests.exceptions.RequestException as e:
            return {'error': str(e), 'status_code': 0, 'body': "Request failed."}
        except Exception as e:
            return {'error': str(e), 'status_code': 0, 'body': "An unexpected error occurred."}

    def _run_assertion(self, assertion, response, is_json):
        """Runs a single assertion against the response."""
        target = assertion.get('target')
        expected = assertion.get('expected')
        name = assertion.get('name', f"Assert {target}")

        if target == 'status_code':
            success = response.status_code == int(expected)
            return {
                'name': name, 'status': 'pass' if success else 'fail',
                'message': f"Expected {expected}, got {response.status_code}",
            }

        if target == 'body_contains':
            success = expected in response.text
            msg = f"Body contains '{expected}'" if success else f"Body does not contain '{expected}'"
            return {'name': name, 'status': 'pass' if success else 'fail', 'message': msg}

        if target == 'response_time' and expected:
            elapsed_ms = response.elapsed.total_seconds() * 1000
            success = elapsed_ms < float(expected)
            return {
                'name': name, 'status': 'pass' if success else 'fail',
                'message': f"Response time {elapsed_ms:.0f}ms {'<' if success else '>='} {expected}ms",
            }

        return {'name': name, 'status': 'skip', 'message': f"Unknown assertion type: {target}"}
