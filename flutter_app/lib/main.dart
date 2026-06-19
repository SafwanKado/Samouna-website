import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import 'providers/app_state.dart';
import 'views/auth_screen.dart';
import 'views/home_screen.dart';
import 'views/bakery_details_screen.dart';
import 'views/cart_screen.dart';
import 'views/order_tracking_screen.dart';
import 'views/owner_dashboard_screen.dart';
import 'views/driver_dashboard_screen.dart';
import 'models/models.dart';

void main() async {
  // Ensure Flutter engine and Firebase integrations are fully initialized on mobile startup
  WidgetsFlutterBinding.ensureInitialized();
  
  // Note: Standard Firebase configuration (Firebase.initializeApp) goes here when deploying to Android/iOS.
  // We wrap this inside our main App widget with State notifications.
  
  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AppState()),
      ],
      child: const SamounaApp(),
    ),
  );
}

class SamounaApp extends StatelessWidget {
  const SamounaApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final appState = Provider.of<AppState>(context);

    return MaterialApp(
      title: 'Samouna Mobile',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        primarySwatch: Colors.orange,
        scaffoldBackgroundColor: const Color(0xFFFAF9F6), // Match Cream/White Web Theme
        textTheme: GoogleFonts.interTextTheme(Theme.of(context).textTheme),
        colorScheme: ColorScheme.fromSeed(
          seedColor: Colors.orange[800]!,
          primary: Colors.orange[800]!,
          secondary: Colors.amber[700]!,
          surface: Colors.white,
          background: const Color(0xFFFAF9F6),
        ),
        appBarTheme: const AppBarTheme(
          backgroundColor: Colors.white,
          elevation: 0,
          iconTheme: IconThemeData(color: Colors.black80),
          titleTextStyle: TextStyle(color: Colors.black80, fontSize: 18, fontWeight: FontWeight.bold),
        ),
        cardTheme: CardTheme(
          elevation: 1,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        ),
      ),
      home: _getLandingPage(appState),
      onGenerateRoute: (settings) {
        // Safe mapping of dynamic route arguments matching React Router details
        if (settings.name == '/bakery') {
          final String bakeryId = settings.arguments as String;
          return MaterialPageRoute(
            builder: (context) => BakeryDetailsScreen(bakeryId: bakeryId),
          );
        }
        if (settings.name == '/order') {
          final String orderId = settings.arguments as String;
          return MaterialPageRoute(
            builder: (context) => OrderTrackingScreen(orderId: orderId),
          );
        }
        return null;
      },
      routes: {
        '/auth': (context) => const AuthScreen(),
        '/home': (context) => const HomeScreen(),
        '/cart': (context) => const CartScreen(),
        '/owner': (context) => const OwnerDashboardScreen(),
        '/driver': (context) => const DriverDashboardScreen(),
      },
    );
  }

  /// Handles routing based on User Roles (Admin, Driver, Owner, Customer)
  Widget _getLandingPage(AppState state) {
    if (state.isLoading) {
      return const Scaffold(
        body: Center(
          child: CircularProgressIndicator(color: Colors.orange),
        ),
      );
    }

    if (!state.isAuthenticated) {
      return const AuthScreen();
    }

    // Role-based routing to matching dashboard consoles
    switch (state.profile?.role) {
      case UserRole.owner:
        return const OwnerDashboardScreen();
      case UserRole.driver:
        return const DriverDashboardScreen();
      case UserRole.admin:
      case UserRole.customer:
      default:
        return const HomeScreen();
    }
  }
}
