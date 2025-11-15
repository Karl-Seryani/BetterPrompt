# BetterPrompt for GitHub Copilot

**Turn vague prompts into detailed, actionable requests for GitHub Copilot Chat**

BetterPrompt analyzes your prompts for vagueness and automatically enhances them to get better responses from GitHub Copilot. Works seamlessly with `@workspace` chat in VS Code.

## ✨ Features

- 🔍 **Instant Vagueness Detection** - Analyzes prompts in <100ms for unclear patterns
- 🤖 **AI-Powered Enhancement** - Uses GitHub Copilot to automatically improve your prompts
- 💬 **Chat Integration** - Use `@betterprompt` in GitHub Copilot Chat for inline enhancement
- 📊 **Before/After Diff** - See exactly what changed and why
- 🎯 **Persona-Based** - Auto-detects beginner vs developer level
- 🚀 **Zero Config** - Works instantly with GitHub Copilot (no API keys needed)

## 🎬 Quick Start

### Method 1: Chat Participant (Recommended)

Use `@betterprompt` in GitHub Copilot Chat:

```
@betterprompt make a login system
```

BetterPrompt will analyze and enhance your prompt, then show you the improved version.

### Method 2: Command Palette

1. Open Command Palette (`Cmd+Shift+P` or `Ctrl+Shift+P`)
2. Type "BetterPrompt: Optimize Current Prompt"
3. Enter your prompt
4. Review the enhanced version

## 📖 Example

**❌ Before (Vague):**
```
make a login page
```

**✅ After (Enhanced):**
```
Create a secure login page with the following requirements:

Technical Implementation:
- Frontend: React component with form validation
- Authentication: JWT token-based authentication
- Security: Password hashing (bcrypt), CSRF protection, rate limiting
- Validation: Email format, password strength (min 8 chars, uppercase, number, special char)

Features to Include:
1. Email and password input fields
2. "Remember me" checkbox (optional)
3. "Forgot password?" link
4. Error handling with user-friendly messages
5. Loading state during authentication
6. Redirect to dashboard on success

Best Practices:
- Use HTTPS only
- Implement proper error messages (avoid revealing if email exists)
- Add CAPTCHA after failed attempts
- Follow WCAG accessibility guidelines
- Responsive design for mobile/desktop

Step-by-step approach:
1. Create login form component with controlled inputs
2. Add client-side validation
3. Implement authentication API call
4. Handle JWT token storage
5. Set up protected route navigation
6. Add error handling and loading states
7. Write tests for authentication flow
```

## 🎯 Chat Modes

### Review Mode (Default)
Shows you the enhanced prompt before sending to Copilot:
```
@betterprompt /review build an API
```

### Auto Mode (Transparent)
Automatically enhances and sends to Copilot:
```
@betterprompt /auto build an API
```

## ⚙️ Configuration

Open Settings (`Cmd+,`) and search for "BetterPrompt":

| Setting | Description | Default |
|---------|-------------|---------|
| `betterprompt.enabled` | Enable/disable extension | `true` |
| `betterprompt.userLevel` | Your experience level (auto/beginner/developer) | `auto` |
| `betterprompt.vaguenessThreshold` | Min score to trigger rewrite (0-100) | `30` |
| `betterprompt.preferredModel` | Preferred AI model | `auto` (uses Copilot) |
| `betterprompt.chatMode` | Default chat behavior (review/auto) | `review` |
| `betterprompt.showDiff` | Show before/after diff view | `true` |

## 📋 Requirements

- **VS Code 1.85.0 or higher**
- **GitHub Copilot** subscription (for AI enhancement)
- *Optional:* Groq API key (free alternative if Copilot unavailable)

## 🔧 Commands

| Command | Description |
|---------|-------------|
| `BetterPrompt: Optimize Current Prompt` | Manually optimize a prompt |
| `BetterPrompt: Open Settings` | Quick access to settings |
| `BetterPrompt: Reset Onboarding` | Reset first-run setup (testing) |

## 🎓 How It Works

1. **Analysis** - Scans prompt for vague verbs, missing context, unclear scope
2. **Scoring** - Assigns vagueness score (0-100, higher = more vague)
3. **Enhancement** - Uses GitHub Copilot to rewrite with:
   - Specific technical requirements
   - Security best practices
   - Step-by-step implementation plan
   - Error handling considerations
4. **Review** - Shows diff and lets you approve/copy/dismiss

## 🔐 Privacy

- **Client-side analysis** - Vagueness detection runs locally (<100ms)
- **No telemetry** - Zero tracking or analytics
- **Your choice** - Enhancement only happens when you trigger it
- **Transparent** - See exactly what changes before accepting

## 🐛 Troubleshooting

### "No language model available" error
Make sure GitHub Copilot extension is installed and active.

### Enhancement not working
1. Check GitHub Copilot is enabled
2. Try setting a Groq API key as fallback (free at [console.groq.com](https://console.groq.com))
3. Verify `betterprompt.enabled` is `true` in settings

### Prompts not being enhanced
Increase `betterprompt.vaguenessThreshold` in settings (try `20` instead of `30`)

## 📝 License

MIT License - See [LICENSE](LICENSE) for details

## 🤝 Contributing

Issues and pull requests welcome at [GitHub](https://github.com/Karl-Seryani/BetterPrompt)

## 💡 Tips for Best Results

1. **Start vague, let BetterPrompt enhance** - Type naturally, we'll add the details
2. **Use chat mode** - `@betterprompt` is faster than command palette
3. **Review enhancements** - Learn what makes a good prompt
4. **Adjust threshold** - Lower it if you want more suggestions
5. **Set your level** - Manual "developer" mode gives TDD/architecture focus

---

**Made with ❤️ for better AI interactions**
