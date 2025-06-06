# Property Manager Mobile App

A React Native mobile application for tenants to manage their rental experience, including rent payments, maintenance requests, and account management.

## Features

### Tenant Portal
- **Secure Authentication** - Login with email and password
- **Dashboard** - Overview of recent payments and maintenance requests
- **Rent Payments** - View payment history and make new payments via Stripe
- **Maintenance Requests** - Submit and track maintenance requests
- **Profile Management** - Update personal information and emergency contacts

### Key Capabilities
- Real-time data synchronization with backend API
- Secure payment processing through Stripe integration
- Offline-capable authentication with secure token storage
- Push notifications for important updates
- Cross-platform support (iOS and Android)

## Architecture

### Tech Stack
- **React Native** with Expo
- **TypeScript** for type safety
- **React Navigation** for navigation
- **AsyncStorage** for secure local data storage
- **React Native Paper** for UI components

### Backend Integration
The mobile app connects to your existing Node.js/Express backend API endpoints:
- `/api/tenant/login` - Authentication
- `/api/tenant/rent-payments` - Payment data
- `/api/tenant/maintenance-requests` - Maintenance requests
- `/api/tenant/create-payment-intent` - Stripe payment processing

## Setup Instructions

### Prerequisites
- Node.js 16+ installed
- Expo CLI: `npm install -g @expo/cli`
- iOS Simulator (Mac) or Android Studio
- Backend server running on localhost:5000

### Installation

1. **Navigate to mobile directory:**
   ```bash
   cd mobile
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure API endpoint:**
   Edit `src/services/api.ts` and update the `API_BASE_URL`:
   ```typescript
   const API_BASE_URL = 'http://your-backend-url:5000';
   ```

4. **Start the development server:**
   ```bash
   npm start
   ```

5. **Run on device/simulator:**
   - Press `i` for iOS simulator
   - Press `a` for Android emulator
   - Scan QR code with Expo Go app on physical device

### Testing Credentials
Use these credentials to test the tenant portal:
- **Email:** mjoseph4341@gmail.com
- **Password:** password123

## App Structure

```
mobile/
├── App.tsx                 # Main app component with navigation
├── app.json               # Expo configuration
├── package.json           # Dependencies and scripts
└── src/
    ├── context/
    │   └── AuthContext.tsx    # Authentication state management
    ├── screens/
    │   ├── LoginScreen.tsx    # Login interface
    │   ├── DashboardScreen.tsx # Main dashboard
    │   ├── MaintenanceScreen.tsx # Maintenance requests
    │   ├── PaymentsScreen.tsx  # Rent payments
    │   └── ProfileScreen.tsx   # User profile
    └── services/
        └── api.ts             # API service layer
```

## Key Components

### Authentication Flow
- Secure login with email/password
- JWT token storage in AsyncStorage
- Automatic session restoration
- Logout with token cleanup

### Payment Integration
- View payment history with status indicators
- Secure payment processing via Stripe
- Real-time payment status updates
- Support for pending, paid, and overdue payments

### Maintenance Requests
- Submit new requests with categories and priorities
- Track request status (pending, in progress, completed)
- View request history
- Priority-based color coding

### Profile Management
- Edit personal information
- Update emergency contacts
- View lease details
- Secure logout functionality

## Deployment Options

### Expo Application Services (EAS)
1. **Install EAS CLI:**
   ```bash
   npm install -g eas-cli
   ```

2. **Configure EAS:**
   ```bash
   eas build:configure
   ```

3. **Build for production:**
   ```bash
   eas build --platform all
   ```

### React Native CLI (Advanced)
For more control over native code:
1. Eject from Expo: `expo eject`
2. Follow React Native CLI build instructions
3. Configure native dependencies manually

## Security Features

### Data Protection
- Secure token storage with AsyncStorage
- HTTPS-only API communication
- Input validation and sanitization
- Session timeout handling

### Payment Security
- PCI-compliant Stripe integration
- No sensitive payment data stored locally
- Secure payment tokenization
- Real-time fraud detection

## Customization

### Branding
- Update colors in `styles` objects throughout components
- Replace app icons in `assets/` directory
- Modify app name in `app.json`

### Features
- Add new screens in `src/screens/`
- Extend API service in `src/services/api.ts`
- Update navigation in `App.tsx`

## Troubleshooting

### Common Issues

**Connection Errors:**
- Verify backend server is running
- Check API_BASE_URL configuration
- Ensure network connectivity

**Authentication Issues:**
- Clear AsyncStorage data
- Verify credentials with backend
- Check token expiration

**Build Errors:**
- Clear node_modules: `rm -rf node_modules && npm install`
- Clear Expo cache: `expo start -c`
- Update Expo CLI: `npm install -g @expo/cli@latest`

### Development Tips
- Use Expo DevTools for debugging
- Enable remote debugging for network inspection
- Use React Native Debugger for state inspection
- Test on both iOS and Android platforms

## Support

For technical support or feature requests:
1. Check existing maintenance requests in the app
2. Contact property management through the app
3. Submit feedback through the profile section

## License

This mobile application is part of the Property Manager platform and follows the same licensing terms as the main project.