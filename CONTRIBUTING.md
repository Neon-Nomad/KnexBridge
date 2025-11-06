# Contributing to KnexBridge

Thank you for your interest in contributing to KnexBridge. This project thrives on the support of developers who bring new ideas, improvements, and fixes. The guidelines below help ensure a smooth experience for everyone involved.

## Code of Conduct
Participation in this project is governed by the [Contributor Covenant Code of Conduct](https://www.contributor-covenant.org/version/2/1/code_of_conduct/). Please be respectful, inclusive, and constructive in all interactions.

## Ways to Contribute
- Report bugs and regressions
- Propose new features and enhancements
- Improve documentation and examples
- Submit pull requests with fixes or new functionality
- Share feedback in discussions and roadmap threads

## Getting Started
### 1. Fork and Clone
`ash
git clone https://github.com/<your-username>/KnexBridge.git
cd KnexBridge
npm install
`

### 2. Build the Workspace
`ash
npm run build
`

### 3. Run the CLI Locally
`ash
node packages/cli/dist/cli.js generate --config ./knexfile.js --out ./generated
`

### 4. Run Tests
`ash
npm test
`
Ensure all tests pass before opening a pull request.

## Development Standards
- Node.js >= 18.18.0 is required.
- Follow the TypeScript configuration defined in each package.
- Keep dependencies minimal and document any new additions.
- Use environment-agnostic code where possible (avoid OS-specific assumptions).

## Branching and Commits
- Create feature branches from main:
  `ash
  git checkout -b feature/add-postgres-support
  `
- Use [Conventional Commits](https://www.conventionalcommits.org/) (eat:, ix:, chore:, docs:).
- Keep commits focused and messages descriptive.

## Pull Request Checklist
Before submitting a PR:
- [ ] The project builds without TypeScript errors (
pm run build).
- [ ] Tests pass locally (
pm test).
- [ ] Linting has run where applicable (
pm run lint).
- [ ] Documentation is refreshed when behavior changes.
- [ ] Changes include tests or examples when relevant.

## Issue Guidelines
- **Bug reports:** provide KnexBridge version, Node.js version, reproduction steps, and expected vs actual behavior.
- **Feature requests:** describe the use case, sample API/CLI design, and any breaking changes.
- **Questions or ideas:** start a discussion thread to gather community feedback.

## Review Process
1. Maintainers triage new issues and pull requests.
2. Reviews focus on correctness, maintainability, and test coverage.
3. Requested changes will be discussed openly to find the best approach.
4. Once approved, maintainers merge the PR, squash commits if necessary, and tag releases when appropriate.

## Release Philosophy
- Changes that alter CLI behavior or generated output must include a changelog entry via Changesets.
- Patches are released frequently to keep the community moving.
- Semantic versioning is enforced across published packages.

## Community Expectations
- Be responsive to review feedback.
- Respect different perspectives and collaborate toward solutions.
- Celebrate wins by sharing success stories or showcasing integrations.

## Need Help?
If you are unsure about anything, open a GitHub issue with the question label or join the discussions board. Maintainers and contributors are happy to help.

We appreciate your time and effort in making KnexBridge better. Happy coding!
