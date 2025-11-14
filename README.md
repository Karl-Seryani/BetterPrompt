# PromptCraft

**Craft better prompts for AI coding assistants through intelligent analysis and enhancement**

PromptCraft is a VS Code extension that analyzes your prompts for vagueness, enhances them with AI-powered rewriting, and helps you get better responses from AI coding assistants like Claude Code.

## Features

- **Intelligent Prompt Analysis** - Detects vague patterns, missing context, and unclear requirements
- **AI-Powered Rewriting** - Uses Groq AI (free tier) to enhance your prompts with persona-based improvements
- **Persona-Based Enhancement** - Auto-detects whether you're learning or building, with manual override options
- **Before/After Diff View** - See exactly what changed and why
- **User Approval Flow** - Review, copy, or skip enhanced prompts
- **Zero Setup** - Just add your free Groq API key and start crafting
- **Privacy-First** - Client-side analysis, optional AI enhancement

## Example Transformation

**Before:**
```
make a website for my business
```

**After:**
```
I need help creating a website for my business. Here are the requirements:

Tech Stack Questions:
- What technology stack should I use? (React, Vue, plain HTML/CSS/JS?)
- Do I need a backend? (Node.js, Python, PHP?)
- What hosting platform? (Vercel, Netlify, traditional hosting?)

Page Requirements:
- Home page with business information
- Services/Products page
- Contact form
- About page

Design Considerations:
- Responsive design for mobile and desktop
- Modern, professional look
- SEO-friendly structure
- Fast loading times

Step-by-step approach:
1. Set up project structure
2. Create page layouts
3. Implement styling
4. Add interactivity
5. Deploy to hosting

Current context:
- Project: [no file selected]
- Framework: none detected

Please provide recommendations for the tech stack and help me get started with the project structure.
```

## Installation

### From VS Code Marketplace (Coming Soon)
1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X / Cmd+Shift+X)
3. Search for "PromptCraft"
4. Click Install

### From VSIX (Development)
1. Download the latest `.vsix` file from Releases
2. Open VS Code
3. Go to Extensions
4. Click "..." menu > "Install from VSIX"
5. Select the downloaded file

### From Source
```bash
# Clone the repository
git clone https://github.com/yourusername/promptcraft.git
cd promptcraft

# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Run tests
npm test

# Package extension
npm run package

# Install the generated .vsix file
```

## Quick Start

1. **Activate the Extension**
   - Extension activates automatically on VS Code startup
   - You'll see a welcome message on first use

2. **Configure Groq API Key**
   - Get a free API key from [console.groq.com/keys](https://console.groq.com/keys)
   - Open Settings (Ctrl+, / Cmd+,)
   - Search for "PromptCraft"
   - Paste your API key in `Groq Api Key` field

3. **Optimize a Prompt**
   - Open Command Palette (Ctrl+Shift+P / Cmd+Shift+P)
   - Type "PromptCraft: Optimize Current Prompt"
   - Enter your vague prompt
   - Review the enhanced version

4. **Review and Use**
   - View the before/after diff
   - Choose to Copy Enhanced or Dismiss
   - Paste into your AI assistant

## Configuration

Access settings via File > Preferences > Settings, then search for "PromptCraft":

| Setting | Description | Default |
|---------|-------------|---------|
| `promptcraft.enabled` | Enable/disable prompt optimization | `true` |
| `promptcraft.groqApiKey` | Groq API key for AI-powered rewriting | `""` |
| `promptcraft.userLevel` | Experience level (auto/beginner/developer) | `auto` |
| `promptcraft.vaguenessThreshold` | Min score (0-100) to trigger rewriting | `30` |
| `promptcraft.autoOptimize` | Automatically optimize without confirmation | `false` |
| `promptcraft.showDiff` | Show before/after diff view | `true` |

## Persona System

PromptCraft enhances prompts differently based on your experience level:

### Auto Mode (Default)
Automatically detects from your prompt:
- **Learning prompts** ("teach me", "explain", "tutorial") → Simple, step-by-step guidance
- **Development prompts** ("implement", "refactor", "build") → TDD, best practices, architecture

### Beginner Mode
For new coders:
- Step-by-step breakdowns
- Simple language, jargon explained
- Vanilla technologies first
- Encouraging tone

### Developer Mode
For experienced developers:
- Test-Driven Development (TDD)
- SOLID principles and design patterns
- Security best practices (OWASP)
- Performance optimization
- Production-ready code
- Comprehensive error handling

### Custom Templates (Coming Soon)

Template management and custom templates are planned for Sprint 4.

## Commands

| Command | Description |
|---------|-------------|
| `promptcraft.optimizePrompt` | Optimize current prompt |
| `promptcraft.showSettings` | Open PromptCraft settings |
| `promptcraft.showAnalytics` | View analytics dashboard (Coming Soon) |
| `promptcraft.manageTemplates` | Manage prompt templates (Coming Soon) |

## Analytics (Coming Soon)

Analytics dashboard is planned for Sprint 4:

- Total prompts analyzed
- Acceptance rate
- Vagueness score trends
- AI tokens used
- Enhancement confidence scores

Access via Command Palette > "PromptCraft: View Analytics Dashboard"

## Development

### Prerequisites
- Node.js 18+ or 20+
- VS Code 1.85.0+
- TypeScript 5.3+

### Setup
```bash
# Install dependencies
npm install

# Watch mode (auto-recompile on changes)
npm run watch

# Run linting
npm run lint

# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

### Project Structure
```
promptcraft/
├── src/
│   ├── extension.ts        # Entry point
│   ├── analyzer/           # Prompt analysis logic
│   ├── rewriter/           # AI-powered rewriting engine
│   ├── templates/          # Template library (Coming Soon)
│   ├── ui/                 # UI components (Coming Soon)
│   └── db/                 # Database layer
├── tests/
│   ├── unit/               # Unit tests
│   ├── integration/        # Integration tests
│   └── e2e/                # End-to-end tests
├── docs/                   # Documentation
└── package.json
```

### Testing
```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Watch mode
npm run test:watch
```

### Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Write/update tests
5. Ensure all tests pass (`npm test`)
6. Commit using conventional commits (`git commit -m 'feat: add amazing feature'`)
7. Push to your fork (`git push origin feature/amazing-feature`)
8. Open a Pull Request

### Code Quality
- Unit test coverage must be >80%
- All code must pass ESLint and Prettier checks
- No `any` types (strict TypeScript)
- Follow conventional commit format

## Roadmap

### Sprint 1: Foundation (Weeks 1-2) ✅
- [x] Project setup
- [x] VS Code extension scaffold
- [x] Documentation framework
- [x] CI/CD pipeline

### Sprint 2: Core AI Integration (Weeks 3-4) ✅
- [x] Prompt analyzer engine with vagueness scoring
- [x] Groq AI integration with Llama 3.3 70B
- [x] Persona-based system prompts (auto/beginner/developer)
- [x] Unit tests (40/40 passing)
- [x] Before/after diff viewer
- [x] User approval workflow

### Sprint 3: Advanced Features (Weeks 5-6)
- [ ] VS Code Language Model API integration
- [ ] Auto-detect Copilot/Claude Code availability
- [ ] Fallback priority: VS Code LM → Groq → Error
- [ ] Fix database async initialization
- [ ] Integration tests

### Sprint 4: Polish & Launch (Weeks 7-8)
- [ ] Analytics dashboard
- [ ] Template management UI
- [ ] Keyboard shortcuts
- [ ] Performance optimization
- [ ] Marketplace submission

### Future (v2.0+)
- Multi-model support (Claude, GPT-4, etc.)
- Team collaboration features
- Template marketplace
- Multi-language support

## FAQ

**Q: Does PromptCraft send my code to external servers?**
A: Only prompts are sent to Groq AI for enhancement (optional). All analysis is done locally. Your code stays on your machine.

**Q: Will this work with GitHub Copilot / Claude Code?**
A: Yes! PromptCraft enhances prompts you can use with any AI coding assistant.

**Q: How much does it cost?**
A: PromptCraft is free and open source (MIT License). Groq API is also free (unlimited tier).

**Q: Can I use this in commercial projects?**
A: Yes, the MIT License allows commercial use.

**Q: What models does it use?**
A: Currently uses Groq's Llama 3.3 70B Versatile (free tier). Sprint 3 will add VS Code Language Model API support.

**Q: How is my data stored?**
A: Analytics data is stored locally in a SQLite database (sql.js) in your VS Code extension storage directory.

## Support

- **Documentation:** [docs/](docs/)
- **Issues:** [GitHub Issues](https://github.com/yourusername/promptcraft/issues)
- **Discussions:** [GitHub Discussions](https://github.com/yourusername/promptcraft/discussions)

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with the [VS Code Extension API](https://code.visualstudio.com/api)
- AI powered by [Groq](https://groq.com) (Llama 3.3 70B Versatile)
- Database powered by [sql.js](https://github.com/sql-js/sql.js)
- Inspired by best practices in prompt engineering

---

**Made for developers who want better AI interactions**
