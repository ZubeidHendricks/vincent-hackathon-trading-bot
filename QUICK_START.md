# 🚀 Quick Start Guide - Vincent Self-Improving AI Agent

## Prerequisites
- Node.js v20.11.1+ (you have v20.19.2 ✅)
- pnpm 10.7.0+ (you have v10.13.1 ✅)

## Step 1: Set Up Environment

1. **Edit the .env file with your Vincent private key:**
   ```bash
   nano .env
   ```
   Replace `your-private-key-here` with your actual Vincent delegatee private key.

## Step 2: Install Dependencies

```bash
pnpm install
```

## Step 3: Run the Self-Improving System

### Development Mode (Recommended)
```bash
pnpm vincent-hackathon:self-improving:dev
```

### Production Mode
```bash
pnpm vincent-hackathon:self-improving
```

### Quick Test (2 minutes)
```bash
pnpm vincent-hackathon:self-improving:test
```

## Step 4: What You'll See

When running, you'll see:
- 🧠 **Learning Events**: Model updates and adaptations
- 💰 **Smart Trades**: AI-driven trading decisions  
- 🛡️ **Risk Management**: Dynamic risk adjustments
- 📊 **Performance Metrics**: Real-time analytics
- 🤖 **Agent Coordination**: Multi-agent collaboration

## Available Commands

```bash
# Self-improving system (NEW!)
pnpm vincent-hackathon:self-improving:dev     # Development mode
pnpm vincent-hackathon:self-improving         # Production mode
pnpm vincent-hackathon:self-improving:test    # Test mode (2 min)

# Original Vincent system
pnpm vincent-hackathon:dev                    # Original development
pnpm vincent-hackathon                        # Original production
```

## Custom Configuration

```bash
# Run with custom parameters
npx tsx packages/dca-backend/src/vincent-hackathon-self-improving.ts \
  --balance 20000 \
  --learning-rate 0.01 \
  --daily-limit 1000
```

## Help

```bash
# Get help and see all options
npx tsx packages/dca-backend/src/vincent-hackathon-self-improving.ts --help
```

## Features

### 🧠 Self-Improvement Framework
- **Continuous Learning**: Agents learn from every trade
- **Reinforcement Learning**: Q-learning for strategy optimization
- **Meta-Learning**: System-wide optimization
- **Dynamic Risk Management**: Adaptive risk models

### 🤖 Intelligent Agents
- **Data Analyst**: Real-time sentiment analysis
- **Adaptive Strategist**: Multi-strategy trading with RL
- **Risk Manager**: Dynamic risk assessment
- **Meta-Learner**: System optimization

### 📊 Advanced Analytics
- Performance tracking and metrics
- Learning velocity monitoring
- Model versioning and deployment
- Real-time adaptation monitoring

Ready to see AI agents that learn and improve! 🎯