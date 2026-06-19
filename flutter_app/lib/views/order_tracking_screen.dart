import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/app_state.dart';
import '../models/models.dart';
import '../services/firebase_service.dart';

class OrderTrackingScreen extends StatefulWidget {
  final String orderId;
  const OrderTrackingScreen({Key? key, required this.orderId}) : super(key: key);

  @override
  State<OrderTrackingScreen> createState() => _OrderTrackingScreenState();
}

class _OrderTrackingScreenState extends State<OrderTrackingScreen> {
  final FirebaseService _firebaseService = FirebaseService();
  double _submittedRating = 5.0;
  final _commentController = TextEditingController();

  Future<void> _submitRating(String bakeryId, AppState appState) async {
    final reviewId = widget.orderId; // Use order ID to prevent multiple ratings
    final review = Review(
      id: reviewId,
      rating: _submittedRating,
      comment: _commentController.text.trim(),
      createdAt: DateTime.now(),
      customerId: appState.authUser?.uid,
      customerName: appState.profile?.name ?? 'Anonymous',
    );

    try {
      await _firebaseService.submitBakeryReview(bakeryId, review);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Thank you for your rating!")),
      );
      Navigator.pop(context);
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text("Error submitting rating: $e")),
      );
    }
  }

  void _showRatingModal(String bakeryId, AppState appState) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return Padding(
              padding: EdgeInsets.only(
                bottom: MediaQuery.of(context).viewInsets.bottom + 24,
                left: 24,
                right: 24,
                top: 24,
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text(
                    "Rate Your Order",
                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    "How was your food and delivery experience?",
                    style: TextStyle(color: Colors.stone[600], fontSize: 13),
                  ),
                  const SizedBox(height: 20),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: List.generate(5, (index) {
                      final starIndex = index + 1;
                      return IconButton(
                        icon: Icon(
                          _submittedRating >= starIndex ? Icons.star : Icons.star_border,
                          size: 36,
                          color: Colors.amber,
                        ),
                        onPressed: () {
                          setModalState(() {
                            _submittedRating = starIndex.toDouble();
                          });
                        },
                      );
                    }),
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: _commentController,
                    maxLines: 3,
                    decoration: InputDecoration(
                      hintText: "Write a brief comment (optional)...",
                      filled: true,
                      fillColor: Colors.stone[50],
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: BorderSide.none,
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),
                  ElevatedButton(
                    onPressed: () => _submitRating(bakeryId, appState),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.orange[850],
                      foregroundColor: Colors.white,
                      minimumSize: const Size(double.infinity, 48),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: const Text("Submit Review", style: TextStyle(fontWeight: FontWeight.bold)),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final appState = Provider.of<AppState>(context);

    return Scaffold(
      backgroundColor: const Color(0xFFFAF9F6),
      appBar: AppBar(
        title: const Text("Track Your Order", style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.home_outlined),
            onPressed: () => Navigator.pushReplacementNamed(context, '/home'),
          ),
        ],
      ),
      body: StreamBuilder<CustOrder?>(
        stream: _firebaseService.streamOrderDetails(widget.orderId),
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          final order = snapshot.data;
          if (order == null) {
            return const Center(child: Text("Order mapping not found."));
          }

          final orderIndex = OrderStatus.values.indexOf(order.status);

          return ListView(
            padding: const EdgeInsets.all(16.0),
            children: [
              // Delivery Progress Header Card
              Card(
                color: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                elevation: 0.5,
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.between,
                        children: [
                          Text(
                            "Order Status: ${order.status.name.toUpperCase()}",
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                              color: order.status == OrderStatus.cancelled
                                  ? Colors.red
                                  : Colors.orange[800],
                            ),
                          ),
                          Text(
                            "ID: #${widget.orderId.substring(0, 5)}",
                            style: TextStyle(color: Colors.stone[500], fontSize: 12, fontWeight: FontWeight.bold),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Text(
                        "Shipping to: ${order.deliveryAddress}",
                        style: TextStyle(color: Colors.stone[700], fontSize: 13),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // Visual Simulated Tracking Timeline (Matching React Views)
              Card(
                color: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                elevation: 0.5,
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
                  child: Column(
                    children: [
                      _buildTimelineStep(
                        title: "Order Placed",
                        sub: "We have received your order request",
                        icon: Icons.receipt_long,
                        isDone: orderIndex >= 0,
                        isActive: orderIndex == 0,
                      ),
                      _buildTimelineConnector(isDone: orderIndex > 0),
                      _buildTimelineStep(
                        title: "Preparing Food",
                        sub: "Our bakers are mixing and preparing",
                        icon: Icons.bakery_dining_rounded,
                        isDone: orderIndex >= 2, // preparing
                        isActive: orderIndex == 2,
                      ),
                      _buildTimelineConnector(isDone: orderIndex > 2),
                      _buildTimelineStep(
                        title: "Out for Delivery",
                        sub: "Driver is on their way with hot food",
                        icon: Icons.motorcycle_rounded,
                        isDone: orderIndex >= 3, // outForDelivery
                        isActive: orderIndex == 3,
                      ),
                      _buildTimelineConnector(isDone: orderIndex > 3),
                      _buildTimelineStep(
                        title: "Delivered",
                        sub: "Order delivered safely! Bon Appetit!",
                        icon: Icons.check_circle_rounded,
                        isDone: orderIndex == 4, // delivered
                        isActive: orderIndex == 4,
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 24),

              // Mock Map Illustration View
              Container(
                height: 180,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(20),
                  image: const DecorationImage(
                    image: NetworkImage("https://images.unsplash.com/photo-1524661135-423995f22d0b?w=600"),
                    fit: BoxFit.cover,
                  ),
                ),
                child: Container(
                  decoration: BoxDecoration(
                    color: Colors.black38,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.location_searching, color: Colors.white, size: 36),
                        const SizedBox(height: 8),
                        Text(
                          order.status == OrderStatus.outForDelivery
                              ? "Driver is nearby..."
                              : "Map active during transit...",
                          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 24),

              // User Actions for Rating
              if (order.status == OrderStatus.delivered)
                ElevatedButton.icon(
                  onPressed: () => _showRatingModal(order.bakeryId, appState),
                  icon: const Icon(Icons.star, color: Colors.white),
                  label: const Text("Rate This Delivery", style: TextStyle(fontWeight: FontWeight.bold)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.amber[800],
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildTimelineStep({
    required String title,
    required String sub,
    required IconData icon,
    required bool isDone,
    required bool isActive,
  }) {
    final color = isActive
        ? Colors.orange[800]
        : isDone
            ? Colors.green[800]
            : Colors.stone[400];

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        CircleAvatar(
          backgroundColor: color!.withOpacity(0.12),
          radius: 20,
          child: Icon(icon, color: color, size: 20),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 14,
                  color: isDone ? Colors.stone[900] : Colors.stone[500],
                ),
              ),
              const SizedBox(height: 2),
              Text(
                sub,
                style: TextStyle(fontSize: 11, color: Colors.stone[600]),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildTimelineConnector({required bool isDone}) {
    return Container(
      width: 2,
      height: 30,
      margin: const EdgeInsets.only(left: 19),
      color: isDone ? Colors.green[700] : Colors.stone[300],
    );
  }
}
