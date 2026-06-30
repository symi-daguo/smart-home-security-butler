# Security Policy

## Supported Versions

We release security updates for the following versions:

| Version | Supported |
| ------- | --------- |
| 0.5.x   | :white_check_mark: |
| < 0.5   | :x: |

## Reporting a Vulnerability

If you discover a security vulnerability, please do NOT open a public issue. Instead, report it privately through one of the following channels:

1. **GitHub Security Advisories**: Go to the Security tab and click "Report a vulnerability"
2. **Email**: Send a detailed report to the project maintainers

Please include:
- Description of the vulnerability
- Steps to reproduce
- Impact assessment
- Any suggested fixes

## Response Time

We aim to respond to security reports within 48 hours and provide a fix within 7 days for critical vulnerabilities.

## Security Best Practices

When deploying this application:
- Never expose the admin interface directly to the internet
- Use strong passwords and enable authentication
- Keep dependencies updated (Dependabot can help)
- Regularly review logs for suspicious activity
- Run containers with minimal permissions
- Use environment variables for secrets, never hardcode them

## Acknowledgments

We thank the following people for reporting security issues responsibly.
