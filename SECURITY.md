# Security Policy

## Reporting a vulnerability

Please report security issues privately rather than opening a public GitHub issue.

For WyreStorm Wingman, send vulnerability details through the private internal WyreStorm reporting route or directly to the project owner using the agreed internal support channel.

Include:

- a clear description of the issue;
- steps to reproduce it;
- affected files, routes, APIs, or workflows;
- any screenshots or logs that help confirm the problem;
- whether the issue affects local development, deployment, data handling, authentication, or customer-facing output.

Do not include sensitive customer data, credentials, tokens, private URLs, or commercial project information in public tickets.

## Supported scope

Security review should cover:

- authentication and session handling;
- project and proposal data handling;
- uploaded documents and generated files;
- server routes and API calls;
- dependency updates;
- GitHub Actions and deployment configuration;
- generated product data and source-data handling.

## Response process

Security reports should be reviewed privately before any public disclosure.

Confirmed issues should be fixed on a dedicated branch, verified with the normal Wingman checks, and merged only after the fix is reviewed.