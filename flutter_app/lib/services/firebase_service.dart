import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../models/models.dart';

class FirebaseService {
  final FirebaseAuth _auth = FirebaseAuth.instance;
  final FirebaseFirestore _db = FirebaseFirestore.instance;

  // MARK: - Authentication Services

  /// Streams the current user's auth state
  Stream<User?> get authStateChanges => _auth.authStateChanges();

  /// Retrieve the currently authenticated Firebase User
  User? get currentUser => _auth.currentUser;

  /// Sign In with Email and Password
  Future<UserCredential> signIn(String email, String password) async {
    return await _auth.signInWithEmailAndPassword(email: email, password: password);
  }

  /// Sign Up with Role definition
  Future<UserCredential> signUp({
    required String email,
    required String password,
    required String name,
    required String phone,
    required UserRole role,
  }) async {
    UserCredential creds = await _auth.createUserWithEmailAndPassword(
      email: email,
      password: password,
    );

    if (creds.user != null) {
      // Send Verification Email
      await creds.user!.sendEmailVerification();

      // Create FireStore User Profile Document
      UserProfile profile = UserProfile(
        uid: creds.user!.uid,
        email: email,
        name: name,
        phone: phone,
        role: role,
        favorites: [],
        active: true,
        createdAt: DateTime.now(),
      );

      await _db.collection('users').doc(creds.user!.uid).set(profile.toMap());
    }
    return creds;
  }

  /// Sign out current session
  Future<void> signOut() async {
    await _auth.signOut();
  }

  /// Send password reset link and log output as requested
  Future<void> sendForgotPasswordReset(String email) async {
    try {
      await _auth.sendPasswordResetEmail(email: email);
    } catch (e) {
      // Direct logging matching our error requirements
      print('Password reset error: $e');
      rethrow;
    }
  }

  // MARK: - User Profiles Database

  /// Stream current user's real-time document snapshot mapping to UserProfile
  Stream<UserProfile?> streamUserProfile(String uid) {
    return _db.collection('users').doc(uid).snapshots().map((snap) {
      if (snap.exists && snap.data() != null) {
        return UserProfile.fromMap(snap.data()!, snap.id);
      }
      return null;
    });
  }

  /// Update User Profile properties
  Future<void> updateUserProfile(String uid, Map<String, dynamic> data) async {
    await _db.collection('users').doc(uid).update(data);
  }

  // MARK: - Bakeries

  /// Stream of active bakeries for the Home customer dashboard
  Stream<List<Bakery>> streamActiveBakeries() {
    return _db
        .collection('bakeries')
        .where('active', isEqualTo: true)
        .snapshots()
        .map((snap) => snap.docs
            .map((doc) => Bakery.fromMap(doc.data(), doc.id))
            .toList());
  }

  /// Stream all bakeries regardless of active status (for admins)
  Stream<List<Bakery>> streamAllBakeries() {
    return _db.collection('bakeries').snapshots().map((snap) => snap.docs
        .map((doc) => Bakery.fromMap(doc.data(), doc.id))
        .toList());
  }

  /// Update favorite status for a customer
  Future<void> toggleFavorite(String uid, String bakeryId, bool isFavorite) async {
    DocumentReference ref = _db.collection('users').doc(uid);
    if (isFavorite) {
      await ref.update({
        'favorites': FieldValue.arrayUnion([bakeryId])
      });
    } else {
      await ref.update({
        'favorites': FieldValue.arrayRemove([bakeryId])
      });
    }
  }

  /// Retrieve specific bakery details
  Future<Bakery?> getBakery(String id) async {
    DocumentSnapshot<Map<String, dynamic>> doc =
        await _db.collection('bakeries').doc(id).get();
    if (doc.exists && doc.data() != null) {
      return Bakery.fromMap(doc.data()!, doc.id);
    }
    return null;
  }

  /// Create new bakery document (for owners/admin)
  Future<String> createBakery(Bakery bakery) async {
    DocumentReference ref = await _db.collection('bakeries').add(bakery.toMap());
    return ref.id;
  }

  /// Update existing bakery details
  Future<void> updateBakery(String id, Map<String, dynamic> data) async {
    await _db.collection('bakeries').doc(id).update(data);
  }

  // MARK: - Products & Menu Catalogues

  /// Stream products belonging to a specific bakery
  Stream<List<Product>> streamBakeryProducts(String bakeryId) {
    return _db
        .collection('products')
        .where('bakeryId', isEqualTo: bakeryId)
        .snapshots()
        .map((snap) => snap.docs
            .map((doc) => Product.fromMap(doc.data(), doc.id))
            .toList());
  }

  /// Update stock levels or detail configurations of a menu product
  Future<void> updateProduct(String id, Map<String, dynamic> data) async {
    await _db.collection('products').doc(id).update(data);
  }

  /// Create or load new custom bakery product
  Future<String> addProduct(Product product) async {
    DocumentReference ref = await _db.collection('products').add(product.toMap());
    return ref.id;
  }

  /// Delete redundant products
  Future<void> deleteProduct(String id) async {
    await _db.collection('products').doc(id).delete();
  }

  // MARK: - Orders

  /// Submit new customer Checkout Order
  Future<String> createOrder(CustOrder order) async {
    DocumentReference ref = await _db.collection('orders').add(order.toMap());
    return ref.id;
  }

  /// Stream singular order details for tracking status lines
  Stream<CustOrder?> streamOrderDetails(String orderId) {
    return _db.collection('orders').doc(orderId).snapshots().map((snap) {
      if (snap.exists && snap.data() != null) {
        return CustOrder.fromMap(snap.data()!, snap.id);
      }
      return null;
    });
  }

  /// Stream list of customer completed / active orders
  Stream<List<CustOrder>> streamCustomerOrders(String customerId) {
    return _db
        .collection('orders')
        .where('customerId', isEqualTo: customerId)
        .orderBy('createdAt', descending: true)
        .snapshots()
        .map((snap) => snap.docs
            .map((doc) => CustOrder.fromMap(doc.data(), doc.id))
            .toList());
  }

  /// Stream active dashboard orders for Owner
  Stream<List<CustOrder>> streamBakeryOrders(String bakeryId) {
    return _db
        .collection('orders')
        .where('bakeryId', isEqualTo: bakeryId)
        .snapshots()
        .map((snap) => snap.docs
            .map((doc) => CustOrder.fromMap(doc.data(), doc.id))
            .toList());
  }

  /// Stream unaccepted available delivery orders for Drivers
  Stream<List<CustOrder>> streamAvailableDriverOrders() {
    return _db
        .collection('orders')
        .where('status', isEqualTo: OrderStatus.accepted.name)
        .snapshots()
        .map((snap) => snap.docs
            .map((doc) => CustOrder.fromMap(doc.data(), doc.id))
            .toList());
  }

  /// Stream delivery tasks actively accepted by a particular driver
  Stream<List<CustOrder>> streamActiveDriverAssignments(String driverId) {
    return _db
        .collection('orders')
        .where('driverId', isEqualTo: driverId)
        .snapshots()
        .map((snap) => snap.docs
            .map((doc) => CustOrder.fromMap(doc.data(), doc.id))
            .toList());
  }

  /// Update existing Delivery Order Status
  Future<void> updateOrderStatus(String orderId, OrderStatus status) async {
    await _db.collection('orders').doc(orderId).update({
      'status': status.name,
    });
  }

  /// Driver accepts a delivery task
  Future<void> assignDriverToOrder(String orderId, String driverId) async {
    await _db.collection('orders').doc(orderId).update({
      'driverId': driverId,
      'status': OrderStatus.preparing.name, // transition
    });
  }

  // MARK: - Ratings & Reviews

  /// Fetch or Stream subcollection ratings for individual bakeries
  Stream<List<Review>> streamBakeryReviews(String bakeryId) {
    return _db
        .collection('bakeries')
        .doc(bakeryId)
        .collection('ratings')
        .orderBy('createdAt', descending: true)
        .snapshots()
        .map((snap) => snap.docs
            .map((doc) => Review.fromMap(doc.data(), doc.id))
            .toList());
  }

  /// Submit scoring review on a completed delivery task
  Future<void> submitBakeryReview(String bakeryId, Review review) async {
    await _db
        .collection('bakeries')
        .doc(bakeryId)
        .collection('ratings')
        .doc(review.id)
        .set(review.toMap());
  }
}
