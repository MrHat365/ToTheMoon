# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ToTheMoon Dashboard is a Next.js 15 web application for cryptocurrency trading management. It provides a comprehensive interface for managing trading templates, account configurations, and executing orders across multiple cryptocurrency exchanges (Binance, Coinbase, Kraken).

## Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Run linting
npm run lint

# Initialize database with sample data
npm run init-db

# Test exchange connections
npm run test-exchanges
```

## Technology Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Database**: MongoDB with custom connection client
- **Styling**: Tailwind CSS with CSS variables for theming
- **UI Components**: shadcn/ui (Radix UI primitives)
- **Icons**: Lucide React
- **Package Manager**: npm (with legacy-peer-deps)
- **Exchange APIs**: Binance, Bybit, Bitget, OKX
- **Runtime Tools**: tsx for TypeScript script execution

## Architecture Overview

### Application Structure

The app uses Next.js App Router with a clear page-based architecture:

- **`/`** (Root) - Redirects to `/template-management`
- **`/template-management`** - Main dashboard for managing trading templates
- **`/control-center`** - Active trading control interface with real-time order management

### Core Data Models

**Template Structure**:
```typescript
interface Template {
  id: string
  name: string
  status: "enabled" | "disabled"
  runningStatus: "running" | "stopped"
  activeControl: ControlConfig    // Primary trading configuration
  passiveControl: ControlConfig   // Secondary trading configuration
}

interface ControlConfig {
  exchange: string                // "Binance" | "Coinbase" | "Kraken"
  accounts: Account[]             // Multiple accounts per exchange
  executionMode: "loop" | "random" // Account execution strategy
}

interface Account {
  id: string
  name: string
  apiKey: string
  secretKey: string
  passphrase: string
}
```

### Component Architecture

**Layout Components**:
- `app/layout.tsx` - Root layout with theme provider and header
- `components/header.tsx` - Navigation header
- `components/theme-provider.tsx` - Dark/light theme management

**Feature Components**:
- `components/template-dialog.tsx` - Complex modal for template creation/editing
- `components/ui/` - shadcn/ui component library (30+ components)

**Page Components**:
- `app/template-management/page.tsx` - Template CRUD interface
- `app/control-center/page.tsx` - Real-time trading control dashboard

### Trading Features

**Template Management**:
- Create/edit trading templates with dual control systems (active/passive)
- Manage multiple exchange accounts per template
- Toggle template status and monitor running state

**Control Center**:
- Real-time order placement (GTC LIMIT, IOC LIMIT, MARKET orders)
- Automated timing tasks with configurable parameters
- Account selection and execution mode management
- OrderBook level selection (1-10 levels)

**Order Types**:
- **GTC LIMIT**: Good Till Canceled limit orders
- **IOC LIMIT**: Immediate Or Cancel limit orders  
- **MARKET**: Market orders with price targeting

## Development Guidelines

### State Management
- Uses React hooks (useState, useEffect) for local state
- No global state management library - relies on prop drilling and local state
- Mock data is currently hardcoded in components (see `mockTemplates` in control-center)

### Responsive Design
- Mobile-first approach with Tailwind responsive utilities
- Uses `useMediaQuery` hook for conditional desktop/mobile rendering
- Drawer components for mobile, Dialog components for desktop

### Theme System
- CSS variables-based theming via Tailwind
- Light theme is default (`defaultTheme="light"`, `enableSystem={false}`)
- Theme colors follow shadcn/ui conventions (background, foreground, card, etc.)

### Form Handling
- Controlled components with React state
- No form validation library currently implemented
- Account management uses dynamic arrays with add/remove functionality

## Configuration Files

### Important Configurations

**Next.js Config** (`next.config.mjs`):
```javascript
{
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  images: { unoptimized: true }
}
```

**Tailwind Config** (`tailwind.config.ts`):
- Extends base config with shadcn/ui color system
- CSS variables for theme customization
- Custom animations for accordions

**shadcn/ui Config** (`components.json`):
- Style: "default"
- Base color: "neutral"
- Path aliases configured for components, utils, hooks

### Styling Conventions
- Uses CSS custom properties for theming (e.g., `hsl(var(--background))`)
- Components follow shadcn/ui patterns with consistent class naming
- Responsive design with mobile-first approach

## Development Notes

### Chinese Language Support
- UI text is primarily in Chinese (模板名称, 主动控制, 被动控制, etc.)
- Component interfaces and code are in English
- Consider this when making UI changes

### Mock Data Integration
- Currently uses hardcoded mock data in components
- When implementing real APIs, replace mock data in:
  - `app/template-management/page.tsx` (templates array)
  - `app/control-center/page.tsx` (mockTemplates array)

### Security Considerations
- API keys and secrets are stored in plain text (development only)
- Implement proper encryption and secure storage for production
- Consider environment-based configuration for sensitive data

### Performance Optimizations
- Next.js App Router provides automatic code splitting
- Components use conditional rendering to minimize DOM updates
- Large component files (1000+ lines) may benefit from splitting

## Database Architecture

### Core Collections
- **templates**: Trading template configurations with active/passive controls
- **accounts**: Exchange account credentials and settings
- **orders**: Order history and status tracking
- **trades**: Executed trade records
- **logs**: System and trading logs

### Data Services
- **TemplateService**: Template CRUD and configuration management
- **TradingService**: Order execution and timed task management
- **DatabaseClient**: MongoDB connection singleton with health checks
- **BaseRepository**: Generic repository pattern for data access

## Exchange Integration

### Supported Exchanges
- **Binance**: REST API + WebSocket with binance-api-node
- **Bybit**: REST API + WebSocket with bybit-api
- **Bitget**: REST API + WebSocket with bitget-api  
- **OKX**: REST API + WebSocket with okx-api

### Exchange Architecture
- **BaseExchange**: Abstract base class with common functionality
- **ExchangeFactory**: Factory pattern for creating exchange instances
- **ExchangeManager**: Singleton manager for multiple exchange connections
- **Unified Interface**: Common interface for all exchange operations

### WebSocket Features
- Real-time order book data
- Live ticker updates
- Order status notifications
- Trade execution alerts

## API Routes

### Template Management
- `GET /api/templates` - List all templates
- `POST /api/templates` - Create new template
- `GET /api/templates/[id]` - Get template with accounts
- `PUT /api/templates/[id]` - Update template
- `DELETE /api/templates/[id]` - Delete template

### Trading Operations
- `POST /api/trading/manual-order` - Place manual orders
- `POST /api/trading/timed-task` - Start/stop timed tasks
- `PUT /api/trading/timed-task` - Update timed task configuration

## Enhanced Features

### Control Center Updates
- **Maximum Trade Amount**: Input field with USDT/TOKEN toggle buttons
- **Real-time Integration**: API calls replace mock data
- **Enhanced Timed Tasks**: Configurable amount limits and execution modes

### Database Integration
- **Persistent Storage**: All templates and accounts stored in MongoDB
- **Data Relationships**: Proper foreign key relationships between collections
- **Transaction Safety**: Atomic operations for critical data updates

## Development Scripts

### Database Management
```bash
npm run init-db        # Initialize database with indexes and sample data
```

### Exchange Testing
```bash
npm run test-exchanges # Test exchange connector implementations
```

## Security Considerations

### API Key Management
- Environment variable storage for sensitive credentials
- Account-level API key encryption in database
- Sandbox/testnet mode support for safe testing

### Risk Controls
- Maximum trade amount limits per timed task
- Account execution mode controls (loop/random)
- Order type restrictions and validation

## Future Development

### Immediate Priorities
- Real-time dashboard updates via WebSocket connections
- Enhanced error handling and retry mechanisms
- Order execution monitoring and alerting

### Advanced Features
- Portfolio management and P&L tracking
- Advanced charting and technical analysis
- Multi-strategy template orchestration
- Risk management and position sizing algorithms