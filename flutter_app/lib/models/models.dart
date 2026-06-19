import 'package:cloud_firestore/cloud_firestore.dart';

/// Role designations matching the web application's roles
enum UserRole { customer, owner, driver, admin }

/// Represents the global User Profile
class UserProfile {
  final String uid;
  final String email;
  final String name;
  final String phone;
  final UserRole role;
  final String? bakeryId;
  final List<String> favorites;
  final bool active;
  final DateTime createdAt;
  final String? photoUrl;

  UserProfile({
    required this.uid,
    required this.email,
    required this.name,
    required this.phone,
    required this.role,
    this.bakeryId,
    required this.favorites,
    required this.active,
    required this.createdAt,
    this.photoUrl,
  });

  factory UserProfile.fromMap(Map<String, dynamic> map, String id) {
    return UserProfile(
      uid: id,
      email: map['email'] ?? '',
      name: map['name'] ?? 'User',
      phone: map['phone'] ?? '',
      role: UserRole.values.firstWhere(
        (r) => r.name == (map['role'] ?? 'customer'),
        orElse: () => UserRole.customer,
      ),
      bakeryId: map['bakeryId'],
      favorites: List<String>.from(map['favorites'] ?? []),
      active: map['active'] ?? true,
      createdAt: map['createdAt'] != null
          ? DateTime.tryParse(map['createdAt']) ?? DateTime.now()
          : DateTime.now(),
      photoUrl: map['photoUrl'],
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'email': email,
      'name': name,
      'phone': phone,
      'role': role.name,
      'bakeryId': bakeryId,
      'favorites': favorites,
      'active': active,
      'createdAt': createdAt.toIso8601String(),
      'photoUrl': photoUrl,
    };
  }
}

/// Represents an Iraqi bakery listing
class Bakery {
  final String id;
  final String name;
  final String description;
  final String imageUrl;
  final double rating;
  final String deliveryTime;
  final double deliveryFee;
  final bool active;
  final String? openTime;
  final String? closeTime;
  final String? ownerId;

  Bakery({
    required this.id,
    required this.name,
    required this.description,
    required this.imageUrl,
    required this.rating,
    required this.deliveryTime,
    required this.deliveryFee,
    required this.active,
    this.openTime,
    this.closeTime,
    this.ownerId,
  });

  factory Bakery.fromMap(Map<String, dynamic> map, String id) {
    return Bakery(
      id: id,
      name: map['name'] ?? '',
      description: map['description'] ?? '',
      imageUrl: map['imageUrl'] ?? 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500',
      rating: (map['rating'] ?? 0.0) is int
          ? (map['rating'] as int).toDouble()
          : (map['rating'] ?? 0.0),
      deliveryTime: map['deliveryTime'] ?? '30 mins',
      deliveryFee: (map['deliveryFee'] ?? 0.0) is int
          ? (map['deliveryFee'] as int).toDouble()
          : (map['deliveryFee'] ?? 0.0),
      active: map['active'] ?? true,
      openTime: map['openTime'],
      closeTime: map['closeTime'],
      ownerId: map['ownerId'],
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'name': name,
      'description': description,
      'imageUrl': imageUrl,
      'rating': rating,
      'deliveryTime': deliveryTime,
      'deliveryFee': deliveryFee,
      'active': active,
      'openTime': openTime,
      'closeTime': closeTime,
      'ownerId': ownerId,
    };
  }

  /// Helper to check if bakery is currently open
  bool isOpen() {
    if (!active) return false;
    if (openTime == null || closeTime == null) return true;

    final now = DateTime.now();
    final currentMinutes = now.hour * 60 + now.minute;

    final openParts = openTime!.split(':').map(int.parse).toList();
    final closeParts = closeTime!.split(':').map(int.parse).toList();

    if (openParts.length < 2 || closeParts.length < 2) return true;

    final openMinutes = openParts[0] * 60 + openParts[1];
    final closeMinutes = closeParts[0] * 60 + closeParts[1];

    if (closeMinutes > openMinutes) {
      return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
    } else {
      // Overnight case
      return currentMinutes >= openMinutes || currentMinutes < closeMinutes;
    }
  }
}

/// Product item listings from specific bakeries
class Product {
  final String id;
  final String name;
  final String description;
  final double price;
  final String category;
  final String imageUrl;
  final bool inStock;
  final int stockQuantity;
  final String bakeryId;

  Product({
    required this.id,
    required this.name,
    required this.description,
    required this.price,
    required this.category,
    required this.imageUrl,
    required this.inStock,
    required this.stockQuantity,
    required this.bakeryId,
  });

  factory Product.fromMap(Map<String, dynamic> map, String id) {
    return Product(
      id: id,
      name: map['name'] ?? '',
      description: map['description'] ?? '',
      price: (map['price'] ?? 0.0) is int
          ? (map['price'] as int).toDouble()
          : (map['price'] ?? 0.0),
      category: map['category'] ?? 'Uncategorized',
      imageUrl: map['imageUrl'] ?? 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500',
      inStock: map['inStock'] ?? true,
      stockQuantity: map['stockQuantity'] ?? 0,
      bakeryId: map['bakeryId'] ?? '',
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'name': name,
      'description': description,
      'price': price,
      'category': category,
      'imageUrl': imageUrl,
      'inStock': inStock,
      'stockQuantity': stockQuantity,
      'bakeryId': bakeryId,
    };
  }
}

/// Represents individual items inside the shopping cart / orders
class OrderItem {
  final String id;
  final String name;
  final double price;
  final int quantity;
  final String imageUrl;
  final String bakeryId;

  OrderItem({
    required this.id,
    required this.name,
    required this.price,
    required this.quantity,
    required this.imageUrl,
    required this.bakeryId,
  });

  factory OrderItem.fromMap(Map<String, dynamic> map) {
    return OrderItem(
      id: map['id'] ?? '',
      name: map['name'] ?? '',
      price: (map['price'] ?? 0.0) is int
          ? (map['price'] as int).toDouble()
          : (map['price'] ?? 0.0),
      quantity: map['quantity'] ?? 1,
      imageUrl: map['imageUrl'] ?? '',
      bakeryId: map['bakeryId'] ?? '',
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'name': name,
      'price': price,
      'quantity': quantity,
      'imageUrl': imageUrl,
      'bakeryId': bakeryId,
    };
  }
}

/// Enum representing the real-time order status
enum OrderStatus { pending, accepted, preparing, outForDelivery, delivered, cancelled }

/// Represents an entire delivery Order
class CustOrder {
  final String id;
  final String customerId;
  final String bakeryId;
  final List<OrderItem> items;
  final double total;
  final OrderStatus status;
  final String deliveryAddress;
  final String? driverId;
  final DateTime createdAt;
  final String? customerName;
  final String? customerPhone;

  CustOrder({
    required this.id,
    required this.customerId,
    required this.bakeryId,
    required this.items,
    required this.total,
    required this.status,
    required this.deliveryAddress,
    this.driverId,
    required this.createdAt,
    this.customerName,
    this.customerPhone,
  });

  factory CustOrder.fromMap(Map<String, dynamic> map, String id) {
    var list = map['items'] as List? ?? [];
    List<OrderItem> cartItems = list.map((item) => OrderItem.fromMap(Map<String, dynamic>.from(item))).toList();
    
    return CustOrder(
      id: id,
      customerId: map['customerId'] ?? '',
      bakeryId: map['bakeryId'] ?? '',
      items: cartItems,
      total: (map['total'] ?? 0.0) is int
          ? (map['total'] as int).toDouble()
          : (map['total'] ?? 0.0),
      status: OrderStatus.values.firstWhere(
        (s) => s.name == (map['status'] ?? 'pending'),
        orElse: () => OrderStatus.pending,
      ),
      deliveryAddress: map['deliveryAddress'] ?? '',
      driverId: map['driverId'],
      createdAt: map['createdAt'] is Timestamp 
          ? (map['createdAt'] as Timestamp).toDate()
          : map['createdAt'] != null 
              ? DateTime.tryParse(map['createdAt']) ?? DateTime.now()
              : DateTime.now(),
      customerName: map['customerName'],
      customerPhone: map['customerPhone'],
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'customerId': customerId,
      'bakeryId': bakeryId,
      'items': items.map((i) => i.toMap()).toList(),
      'total': total,
      'status': status.name,
      'deliveryAddress': deliveryAddress,
      'driverId': driverId,
      'createdAt': createdAt.toIso8601String(),
      'customerName': customerName,
      'customerPhone': customerPhone,
    };
  }
}

/// Represents Ratings/Reviews inside subcollections
class Review {
  final String id;
  final double rating;
  final String comment;
  final DateTime createdAt;
  final String? customerId;
  final String? customerName;

  Review({
    required this.id,
    required this.rating,
    required this.comment,
    required this.createdAt,
    this.customerId,
    this.customerName,
  });

  factory Review.fromMap(Map<String, dynamic> map, String id) {
    return Review(
      id: id,
      rating: (map['rating'] ?? 0.0) is int
          ? (map['rating'] as int).toDouble()
          : (map['rating'] ?? 0.0),
      comment: map['comment'] ?? '',
      createdAt: map['createdAt'] is Timestamp 
          ? (map['createdAt'] as Timestamp).toDate()
          : map['createdAt'] != null 
              ? DateTime.tryParse(map['createdAt']) ?? DateTime.now()
              : DateTime.now(),
      customerId: map['customerId'],
      customerName: map['customerName'] ?? 'Anonymous',
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'rating': rating,
      'comment': comment,
      'createdAt': createdAt.toIso8601String(),
      'customerId': customerId,
      'customerName': customerName,
    };
  }
}
