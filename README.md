# BetterPrompt for GitHub Copilot

**Supercharge your Copilot Chat with intelligent prompt enhancement**

Type `@betterprompt` in GitHub Copilot Chat to transform vague prompts into detailed, actionable requests that get better AI responses.

## ✨ Features

- 🧠 **Intelligent Enhancement** - Automatically understands your intent and adds the right details
- 📁 **Context Aware** - Knows your current file, tech stack, and selected code
- 💬 **Native Chat Integration** - Use `@betterprompt` directly in Copilot Chat
- ⚡ **Instant Analysis** - Detects vagueness in <100ms
- 🚀 **Zero Config** - Works immediately with your Copilot subscription

## 🎬 Quick Start

### In Copilot Chat (Recommended)

Just type `@betterprompt` followed by your prompt:

```
@betterprompt make a login page
```

BetterPrompt analyzes and enhances your prompt, showing you the improved version.

### Chat Modes

**Review Mode** (default) - Shows enhancement before sending:
```
@betterprompt /review build an API
```

**Auto Mode** - Enhances and sends directly to Copilot:
```
@betterprompt /auto build an API
```

## 📖 Examples

### Basic Enhancement

**Your vague prompt:**
```
@betterprompt make a login page
```

**BetterPrompt enhances it to:**
```
Create a login page with:
- Email and password input fields with client-side validation
- Form submission that sends credentials to a /api/auth/login endpoint
- Loading state while authenticating
- Error messages for invalid credentials or network failures
- Redirect to dashboard on successful login
- "Forgot password" link
- Responsive design that works on mobile and desktop
```

### Context-Aware Enhancement

When you're editing `App.tsx` in a React project:

**Your prompt:**
```
@betterprompt add a loading state
```

**BetterPrompt sees your context and enhances:**
```
Add a loading state to this React component (App.tsx):
- Add an `isLoading` prop (boolean)
- Show a spinner or 'Loading...' text when loading
- Disable interactions during loading to prevent double-clicks
- Maintain the component's width to prevent layout shift

Should the loading state be managed internally or passed as a prop?
```

**It knew you were in React without you having to say it!**

## 🧠 How It Works

### Intent Detection
BetterPrompt detects what you're trying to do:

| Intent | Trigger Words | Response Style |
|--------|---------------|----------------|
| **BUILD** | make, create, build | Actionable requirements, phased for big projects |
| **LEARN** | explain, teach, how | Teacher mode with examples |
| **FIX** | fix, debug, error | Diagnostic, asks for error details |
| **IMPROVE** | refactor, optimize | Professional, specific improvements |
| **CONFIGURE** | setup, install, deploy | Step-by-step instructions |

### Context Awareness
Automatically detects and includes:
- Current file you're editing
- Tech stack (React, Next.js, Vue, Express, etc.)
- Selected code in your editor
- TypeScript/linter errors in your file

## ⚙️ Configuration

Open Settings (`Cmd+,`) and search for "BetterPrompt":

| Setting | Description | Default |
|---------|-------------|---------|
| `betterprompt.enabled` | Enable/disable extension | `true` |
| `betterprompt.vaguenessThreshold` | Min vagueness score (0-100) | `30` |
| `betterprompt.chatMode` | Default chat mode (review/auto) | `review` |
| `betterprompt.showDiff` | Show before/after diff | `true` |
| `betterprompt.groqApiKey` | Groq API key (free fallback) | - |

## 🔧 Commands

| Command | Shortcut | Description |
|---------|----------|-------------|
| `BetterPrompt: Optimize Current Prompt` | `Cmd+Shift+E` | Enhance a prompt manually |
| `BetterPrompt: Open Settings` | - | Quick access to settings |

## 📋 Requirements

- **VS Code 1.85.0+**
- **GitHub Copilot** subscription
- **GitHub Copilot Chat** extension

## 🆓 Free Fallback: Groq

If you hit your Copilot quota, BetterPrompt can use Groq (free):

1. Get a free API key at [console.groq.com](https://console.groq.com)
2. Add it to settings: `betterprompt.groqApiKey`
3. BetterPrompt will automatically use it when Copilot isn't available

## 🐛 Troubleshooting

### "@betterprompt" not appearing in chat?
Make sure GitHub Copilot Chat extension is installed and you're signed in.

### Enhancement not working?
1. Check Copilot is active (look for Copilot icon in status bar)
2. Try reloading VS Code
3. Verify your Copilot subscription is active
4. If quota exhausted, add a Groq API key (free)

## 🔐 Privacy

- **Local analysis** - Vagueness detection runs on your machine
- **No telemetry** - Zero tracking
- **Uses Copilot** - Enhancement uses your existing Copilot subscription (or Groq)

## 📝 License

MIT License

---

**Made with ❤️ for better Copilot interactions**
