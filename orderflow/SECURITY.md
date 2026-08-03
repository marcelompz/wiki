# Security Policy

## Reporting a Vulnerability

OrderFlow takes security seriously. If you discover a security vulnerability, please follow these steps:

1. **Do NOT** open a public GitHub issue for the vulnerability
2. Email us at **security@orderflow.dev** with:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

3. You will receive an acknowledgment within **48 hours**
4. We aim to provide a detailed response within **7 days** with a remediation plan
5. Once fixed, we will coordinate disclosure and credit you (if desired)

## Security Best Practices for Contributors

- Never commit secrets, API keys, or credentials
- Always validate and sanitize user input
- Use parameterized queries (Prisma handles this by default)
- Never expose internal errors to clients
- Follow the principle of least privilege
- Report suspicious code via Issues or email

## Supported Versions

| Version | Supported          |
|---------|--------------------|
| 1.x     | Yes                |
| < 1.0   | No                 |

## Disclosure Policy

- We follow responsible disclosure
- Vulnerabilities are fixed before public disclosure
- Credit is given to reporters (unless anonymity is requested)
