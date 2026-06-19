import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/app_state.dart';
import '../models/models.dart';
import '../services/firebase_service.dart';

class DriverDashboardScreen extends StatefulWidget {
  const DriverDashboardScreen({Key? key}) : super(key: key);

  @override
  State<DriverDashboardScreen> createState() => _DriverDashboardScreenState();
}

class _DriverDashboardScreenState extends State<DriverDashboardScreen> {
  final FirebaseService _firebaseService = FirebaseService();

  @override
  Widget build(BuildContext context) {
    final appState = Provider.of<AppState>(context);
    final driverId = appState.authUser?.uid;

    if (driverId == null) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    return DefaultTabController(
      length: 2,
      child: Scaffold(
        backgroundColor: const Color(0xFFFAF9F6),
        appBar: AppBar(
          title: const Text("Drivers Console", style: TextStyle(fontWeight: FontWeight.bold)),
          backgroundColor: Colors.white,
          elevation: 0,
          bottom: TabBar(
            labelColor: Colors.orange[850],
            unselectedLabelColor: Colors.stone[600],
            indicatorColor: Colors.orange[800],
            tabs: const [
              Tab(icon: Icon(Icons.delivery_dining), text: "Available Tasks"),
              Tab(icon: Icon(Icons.assignment_turned_in_rounded), text: "My Deliveries"),
            ],
          ),
        ),
        body: TabBarView(
          children: [
            // Available Orders Tab
            StreamBuilder<List<CustOrder>>(
              stream: _firebaseService.streamAvailableDriverOrders(),
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return const Center(child: CircularProgressIndicator());
                }
                final orders = snapshot.data ?? [];
                if (orders.isEmpty) {
                  return const Center(child: Text("No delivery requests available right now.", style: TextStyle(color: Colors.stone)));
                }

                return ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: orders.length,
                  itemBuilder: (context, idx) {
                    final order = orders[idx];
                    return _buildAvailableOrderTile(order, driverId);
                  },
                );
              },
            ),

            // Active Deliveries Tab
            StreamBuilder<List<CustOrder>>(
              stream: _firebaseService.streamActiveDriverAssignments(driverId),
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return const Center(child: CircularProgressIndicator());
                }
                final orders = snapshot.data ?? [];
                if (orders.isEmpty) {
                  return const Center(child: Text("No active deliveries in progress.", style: TextStyle(color: Colors.stone)));
                }

                return ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: orders.length,
                  itemBuilder: (context, idx) {
                    final order = orders[idx];
                    return _buildActiveDeliveryTile(order);
                  },
                );
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAvailableOrderTile(CustOrder order, String driverId) {
    return Card(
      color: Colors.white,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      margin: const EdgeInsets.only(bottom: 12),
      elevation: 0.5,
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.between,
              children: [
                Text("Order #${order.id.substring(0, 5).toUpperCase()}", style: const TextStyle(fontWeight: FontWeight.bold)),
                Text("\$${order.total.toStringAsFixed(2)}", style: TextStyle(color: Colors.green[800], fontWeight: FontWeight.bold)),
              ],
            ),
            const Divider(height: 24),
            Row(
              children: [
                const Icon(Icons.location_on, color: Colors.orange, size: 18),
                const SizedBox(width: 8),
                Expanded(child: Text(order.deliveryAddress, style: const TextStyle(fontSize: 13))),
              ],
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: () async {
                await _firebaseService.assignDriverToOrder(order.id, driverId);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text("Delivery accepted! Go to My Deliveries to track.")),
                );
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.orange[800],
                minimumSize: const Size(double.infinity, 44),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: const Text("Accept Delivery", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildActiveDeliveryTile(CustOrder order) {
    return Card(
      color: Colors.white,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      margin: const EdgeInsets.only(bottom: 12),
      elevation: 0.5,
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.between,
              children: [
                Text("Order #${order.id.substring(0, 5).toUpperCase()}", style: const TextStyle(fontWeight: FontWeight.bold)),
                _buildStatusBadge(order.status),
              ],
            ),
            const Divider(height: 24),
            Row(
              children: [
                const Icon(Icons.location_on, color: Colors.orange, size: 18),
                const SizedBox(width: 8),
                Expanded(child: Text(order.deliveryAddress, style: const TextStyle(fontSize: 13))),
              ],
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                if (order.status == OrderStatus.preparing)
                  Expanded(
                    child: ElevatedButton(
                      onPressed: () async {
                        await _firebaseService.updateOrderStatus(order.id, OrderStatus.outForDelivery);
                      },
                      style: ElevatedButton.styleFrom(backgroundColor: Colors.blue[700]),
                      child: const Text("Start Delivery", style: TextStyle(color: Colors.white)),
                    ),
                  )
                else if (order.status == OrderStatus.outForDelivery)
                  Expanded(
                    child: ElevatedButton(
                      onPressed: () async {
                        await _firebaseService.updateOrderStatus(order.id, OrderStatus.delivered);
                      },
                      style: ElevatedButton.styleFrom(backgroundColor: Colors.green[700]),
                      child: const Text("Mark Delivered", style: TextStyle(color: Colors.white)),
                    ),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatusBadge(OrderStatus status) {
    Color color = Colors.orange;
    if (status == OrderStatus.outForDelivery) color = Colors.blue;
    if (status == OrderStatus.delivered) color = Colors.green;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(8)),
      child: Text(
        status.name.toUpperCase(),
        style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.bold),
      ),
    );
  }
}
