import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/app_state.dart';
import '../models/models.dart';
import '../services/firebase_service.dart';

class OwnerDashboardScreen extends StatefulWidget {
  const OwnerDashboardScreen({Key? key}) : super(key: key);

  @override
  State<OwnerDashboardScreen> createState() => _OwnerDashboardScreenState();
}

class _OwnerDashboardScreenState extends State<OwnerDashboardScreen> {
  final FirebaseService _firebaseService = FirebaseService();
  final _prodNameController = TextEditingController();
  final _prodDescController = TextEditingController();
  final _prodPriceController = TextEditingController();
  final _prodQtyController = TextEditingController();
  String _selectedCategory = 'Bread';

  @override
  void dispose() {
    _prodNameController.dispose();
    _prodDescController.dispose();
    _prodPriceController.dispose();
    _prodQtyController.dispose();
    super.dispose();
  }

  void _showAddProductDialog(String bakeryId) {
    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: const Text("Add New Product", style: TextStyle(fontWeight: FontWeight.bold)),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                _buildField(_prodNameController, "Product Name"),
                const SizedBox(height: 12),
                _buildField(_prodDescController, "Description", maxLines: 2),
                const SizedBox(height: 12),
                _buildField(_prodPriceController, "Price (\$)", keyboardType: TextInputType.number),
                const SizedBox(height: 12),
                _buildField(_prodQtyController, "Stock Quantity", keyboardType: TextInputType.number),
                const SizedBox(height: 16),
                DropdownButtonFormField<String>(
                  value: _selectedCategory,
                  decoration: InputDecoration(
                    labelText: "Category",
                    filled: true,
                    fillColor: Colors.stone[50],
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                  ),
                  items: const [
                    DropdownMenuItem(value: 'Bread', child: Text("Bread")),
                    DropdownMenuItem(value: 'Samoon', child: Text("Samoon")),
                    DropdownMenuItem(value: 'Sweets', child: Text("Sweets")),
                    DropdownMenuItem(value: 'Snacks', child: Text("Snacks")),
                  ],
                  onChanged: (cat) {
                    if (cat != null) _selectedCategory = cat;
                  },
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text("Cancel"),
            ),
            ElevatedButton(
              onPressed: () async {
                final product = Product(
                  id: '',
                  name: _prodNameController.text.trim(),
                  description: _prodDescController.text.trim(),
                  price: double.tryParse(_prodPriceController.text) ?? 1.0,
                  stockQuantity: int.tryParse(_prodQtyController.text) ?? 10,
                  category: _selectedCategory,
                  inStock: true,
                  imageUrl: 'https://images.unsplash.com/photo-1549931319-a545dcf3bc73?w=300',
                  bakeryId: bakeryId,
                );

                await _firebaseService.addProduct(product);
                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text("Product added successfully!")),
                );
                _prodNameController.clear();
                _prodDescController.clear();
                _prodPriceController.clear();
                _prodQtyController.clear();
              },
              style: ElevatedButton.styleFrom(backgroundColor: Colors.orange[800]),
              child: const Text("Add Product", style: TextStyle(color: Colors.white)),
            ),
          ],
        );
      },
    );
  }

  Widget _buildField(TextEditingController controller, String hint,
      {TextInputType keyboardType = TextInputType.text, int maxLines = 1}) {
    return TextField(
      controller: controller,
      keyboardType: keyboardType,
      maxLines: maxLines,
      decoration: InputDecoration(
        labelText: hint,
        filled: true,
        fillColor: Colors.stone[50],
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final appState = Provider.of<AppState>(context);
    final bakeryId = appState.profile?.bakeryId;

    if (bakeryId == null) {
      return Scaffold(
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.storefront, size: 64, color: Colors.orange),
                const SizedBox(height: 16),
                const Text(
                  "No Bakery Associated",
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 8),
                Text(
                  "Please contact an administrator to link a bakery to your account profile so you can manage your operations.",
                  style: TextStyle(color: Colors.stone[600]),
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          ),
        ),
      );
    }

    return FutureBuilder<Bakery?>(
      future: _firebaseService.getBakery(bakeryId),
      builder: (context, bakerySnap) {
        if (bakerySnap.connectionState == ConnectionState.waiting) {
          return const Scaffold(body: Center(child: CircularProgressIndicator()));
        }
        final bakery = bakerySnap.data;
        if (bakery == null) {
          return const Scaffold(body: Center(child: Text("Bakery document not found.")));
        }

        return DefaultTabController(
          length: 2,
          child: Scaffold(
            backgroundColor: const Color(0xFFFAF9F6),
            appBar: AppBar(
              title: Text(bakery.name, style: const TextStyle(fontWeight: FontWeight.bold)),
              backgroundColor: Colors.white,
              elevation: 0,
              bottom: TabBar(
                labelColor: Colors.orange[850],
                unselectedLabelColor: Colors.stone[600],
                indicatorColor: Colors.orange[855],
                tabs: const [
                  Tab(icon: Icon(Icons.receipt_long), text: "Active Orders"),
                  Tab(icon: Icon(Icons.bakery_dining), text: "Manage Menu"),
                ],
              ),
              actions: [
                Switch(
                  value: bakery.active,
                  activeColor: Colors.orange[800],
                  onChanged: (status) async {
                    await _firebaseService.updateBakery(bakery.id, {'active': status});
                  },
                ),
              ],
            ),
            body: TabBarView(
              children: [
                // Active Orders Tab
                StreamBuilder<List<CustOrder>>(
                  stream: _firebaseService.streamBakeryOrders(bakery.id),
                  builder: (context, ordersSnap) {
                    if (ordersSnap.connectionState == ConnectionState.waiting) {
                      return const Center(child: CircularProgressIndicator());
                    }
                    final orders = ordersSnap.data ?? [];
                    if (orders.isEmpty) {
                      return const Center(child: Text("No incoming orders found.", style: TextStyle(color: Colors.stone)));
                    }

                    return ListView.builder(
                      padding: const EdgeInsets.all(16),
                      itemCount: orders.length,
                      itemBuilder: (context, idx) {
                        final order = orders[idx];
                        return _buildOrderCard(order);
                      },
                    );
                  },
                ),

                // Manage Menu Tab
                StreamBuilder<List<Product>>(
                  stream: _firebaseService.streamBakeryProducts(bakery.id),
                  builder: (context, prodSnap) {
                    if (prodSnap.connectionState == ConnectionState.waiting) {
                      return const Center(child: CircularProgressIndicator());
                    }
                    final products = prodSnap.data ?? [];

                    return Scaffold(
                      backgroundColor: Colors.transparent,
                      floatingActionButton: FloatingActionButton(
                        onPressed: () => _showAddProductDialog(bakery.id),
                        backgroundColor: Colors.orange[800],
                        child: const Icon(Icons.add, color: Colors.white),
                      ),
                      body: products.isEmpty
                          ? const Center(child: Text("Add products to your catalog menu.", style: TextStyle(color: Colors.stone)))
                          : ListView.builder(
                              padding: const EdgeInsets.all(16),
                              itemCount: products.length,
                              itemBuilder: (context, idx) {
                                final prod = products[idx];
                                return _buildMenuItemTile(prod);
                              },
                            ),
                    );
                  },
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildOrderCard(CustOrder order) {
    return Card(
      color: Colors.white,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      elevation: 0.5,
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.between,
              children: [
                Text(
                  "Order #${order.id.substring(0, 5).toUpperCase()}",
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                ),
                Text(
                  order.status.name.toUpperCase(),
                  style: TextStyle(fontWeight: FontWeight.bold, color: Colors.orange[800], fontSize: 13),
                ),
              ],
            ),
            const Divider(height: 24),
            Text(
              "Customer Name: ${order.customerName}",
              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500),
            ),
            const SizedBox(height: 6),
            ...order.items.map((i) => Padding(
                  padding: const EdgeInsets.only(bottom: 4.0),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.between,
                    children: [
                      Text("${i.name} x ${i.quantity}", style: const TextStyle(fontSize: 12, color: Colors.stone)),
                      Text("\$${(i.price * i.quantity).toStringAsFixed(2)}", style: const TextStyle(fontSize: 12)),
                    ],
                  ),
                )),
            const Divider(height: 20),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text("Total: \$${order.total.toStringAsFixed(2)}", style: const TextStyle(fontWeight: FontWeight.bold)),
                if (order.status == OrderStatus.pending)
                  ElevatedButton(
                    onPressed: () async {
                      await _firebaseService.updateOrderStatus(order.id, OrderStatus.accepted);
                    },
                    style: ElevatedButton.styleFrom(backgroundColor: Colors.green),
                    child: const Text("Accept Order", style: TextStyle(color: Colors.white)),
                  )
                else if (order.status == OrderStatus.accepted)
                  ElevatedButton(
                    onPressed: () async {
                      await _firebaseService.updateOrderStatus(order.id, OrderStatus.preparing);
                    },
                    style: ElevatedButton.styleFrom(backgroundColor: Colors.blue),
                    child: const Text("Ready to Deliver", style: TextStyle(color: Colors.white)),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMenuItemTile(Product p) {
    return Card(
      color: Colors.white,
      elevation: 0,
      margin: const EdgeInsets.only(bottom: 8),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.stone[100]!)),
      child: ListTile(
        title: Text(p.name, style: const TextStyle(fontWeight: FontWeight.bold)),
        subtitle: Text("\$${p.price.toStringAsFixed(2)} • Stock: ${p.stockQuantity}"),
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            IconButton(
              icon: Icon(p.inStock ? Icons.check_circle : Icons.offline_bolt,
                  color: p.inStock ? Colors.green : Colors.grey),
              onPressed: () async {
                await _firebaseService.updateProduct(p.id, {'inStock': !p.inStock});
              },
            ),
            IconButton(
              icon: const Icon(Icons.delete_outline, color: Colors.red),
              onPressed: () async {
                await _firebaseService.deleteProduct(p.id);
              },
            ),
          ],
        ),
      ),
    );
  }
}
