import 'dart:async';
import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../models/models.dart';
import '../services/firebase_service.dart';

class AppState extends ChangeNotifier {
  final FirebaseService _firebaseService = FirebaseService();
  
  UserProfile? _currentProfile;
  User? _authUser;
  StreamSubscription<User?>? _authSubscription;
  StreamSubscription<UserProfile?>? _profileSubscription;

  // Cart State Variables
  final List<OrderItem> _cart = [];
  String? _cartBakeryId;

  // App Level configurations
  String _languageCode = 'en'; // Arabic, Kurdish, English support
  bool _isLoading = true;

  AppState() {
    _initializeAuthListener();
  }

  // MARK: - Getters
  UserProfile? get profile => _currentProfile;
  User? get authUser => _authUser;
  List<OrderItem> get cart => _cart;
  String? get cartBakeryId => _cartBakeryId;
  String get languageCode => _languageCode;
  bool get isLoading => _isLoading;

  bool get isAuthenticated => _authUser != null;

  double get cartSubtotal {
    return _cart.fold(0.0, (sum, item) => sum + (item.price * item.quantity));
  }

  // MARK: - Initialization & Listener subscriptions

  void _initializeAuthListener() {
    _authSubscription?.cancel();
    _authSubscription = _firebaseService.authStateChanges.listen((user) {
      _authUser = user;
      _profileSubscription?.cancel();

      if (user != null) {
        // Stream profile document updates
        _profileSubscription = _firebaseService.streamUserProfile(user.uid).listen((profile) {
          _currentProfile = profile;
          _isLoading = false;
          notifyListeners();
        });
      } else {
        _currentProfile = null;
        _isLoading = false;
        notifyListeners();
      }
    });
  }

  // MARK: - Language Configurations

  void setLanguage(String code) {
    if (['en', 'ar', 'ku'].contains(code)) {
      _languageCode = code;
      notifyListeners();
    }
  }

  // MARK: - Session Actions

  Future<void> login(String email, String password) async {
    _setLoading(true);
    try {
      await _firebaseService.signIn(email, password);
    } finally {
      _setLoading(false);
    }
  }

  Future<void> register({
    required String email,
    required String password,
    required String name,
    required String phone,
    required UserRole role,
  }) async {
    _setLoading(true);
    try {
      await _firebaseService.signUp(
        email: email,
        password: password,
        name: name,
        phone: phone,
        role: role,
      );
    } finally {
      _setLoading(false);
    }
  }

  Future<void> logout() async {
    _setLoading(true);
    _cart.clear();
    _cartBakeryId = null;
    await _firebaseService.signOut();
    _setLoading(false);
  }

  Future<void> resetPassword(String email) async {
    await _firebaseService.sendForgotPasswordReset(email);
  }

  // MARK: - Shopping Cart Engine (React Translation)

  /// Adds a product to the shopping session. Returns true if added directly,
  /// returns false if product is from another bakery (prompting confirmation)
  bool addToCart(Product product, {bool forceClear = false}) {
    if (forceClear) {
      _cart.clear();
      _cartBakeryId = null;
    }

    if (_cartBakeryId != null && _cartBakeryId != product.bakeryId) {
      // Prompt user to clear cart from the view container
      return false;
    }

    _cartBakeryId = product.bakeryId;

    // Check if item already exists in current list
    final existingIndex = _cart.indexWhere((item) => item.id == product.id);
    if (existingIndex >= 0) {
      final currentQty = _cart[existingIndex].quantity;
      if (currentQty + 1 <= product.stockQuantity) {
        _cart[existingIndex] = OrderItem(
          id: product.id,
          name: product.name,
          price: product.price,
          quantity: currentQty + 1,
          imageUrl: product.imageUrl,
          bakeryId: product.bakeryId,
        );
      }
    } else {
      if (product.stockQuantity > 0) {
        _cart.add(OrderItem(
          id: product.id,
          name: product.name,
          price: product.price,
          quantity: 1,
          imageUrl: product.imageUrl,
          bakeryId: product.bakeryId,
        ));
      }
    }
    notifyListeners();
    return true;
  }

  void updateCartQuantity(String itemId, int quantity) {
    final idx = _cart.indexWhere((item) => item.id == itemId);
    if (idx >= 0) {
      if (quantity <= 0) {
        _cart.removeAt(idx);
        if (_cart.isEmpty) {
          _cartBakeryId = null;
        }
      } else {
        final current = _cart[idx];
        _cart[idx] = OrderItem(
          id: current.id,
          name: current.name,
          price: current.price,
          quantity: quantity,
          imageUrl: current.imageUrl,
          bakeryId: current.bakeryId,
        );
      }
      notifyListeners();
    }
  }

  void clearCart() {
    _cart.clear();
    _cartBakeryId = null;
    notifyListeners();
  }

  // MARK: - Checkout Placements

  Future<String> checkout(String deliveryAddress) async {
    if (_authUser == null || _cart.isEmpty || _cartBakeryId == null) {
      throw Exception("User is unauthenticated or shopping cart is empty.");
    }

    final newOrder = CustOrder(
      id: '',
      customerId: _authUser!.uid,
      bakeryId: _cartBakeryId!,
      items: List.from(_cart),
      total: cartSubtotal,
      status: OrderStatus.pending,
      deliveryAddress: deliveryAddress,
      createdAt: DateTime.now(),
      customerName: _currentProfile?.name ?? 'Customer',
      customerPhone: _currentProfile?.phone ?? '',
    );

    final orderId = await _firebaseService.createOrder(newOrder);
    
    // Clear cart upon successful database placement
    clearCart();
    return orderId;
  }

  // MARK: - Favorites Toggles

  Future<void> toggleFavorites(String bakeryId) async {
    if (_authUser == null || _currentProfile == null) return;
    
    final isFavorite = _currentProfile!.favorites.contains(bakeryId);
    await _firebaseService.toggleFavorite(_authUser!.uid, bakeryId, !isFavorite);
  }

  void _setLoading(bool value) {
    _isLoading = value;
    notifyListeners();
  }

  @override
  void dispose() {
    _authSubscription?.cancel();
    _profileSubscription?.cancel();
    super.dispose();
  }
}
