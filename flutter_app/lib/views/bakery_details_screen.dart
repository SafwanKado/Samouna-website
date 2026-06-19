import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/app_state.dart';
import '../models/models.dart';
import '../services/firebase_service.dart';

class BakeryDetailsScreen extends StatefulWidget {
  final String bakeryId;
  const BakeryDetailsScreen({Key? key, required this.bakeryId}) : super(key: key);

  @override
  State<BakeryDetailsScreen> createState() => _BakeryDetailsScreenState();
}

class _BakeryDetailsScreenState extends State<BakeryDetailsScreen> with SingleTickerProviderStateMixin {
  final FirebaseService _firebaseService = FirebaseService();
  late TabController _tabController;
  final List<String> _categories = ['All', 'Bread', 'Samoon', 'Sweets', 'Snacks'];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: _categories.length, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  void _handleAddToCart(Product p, AppState appState) {
    // Check if the add is successful or if a mismatch exists
    final success = appState.addToCart(p);

    if (!success) {
      // Cart mismatch: Show clear confirmation modal to match React flow exactly
      showDialog(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text("Replace Shopping Cart?"),
          content: const Text(
            "Your cart contains items from another bakery. Let's empty the cart to add items from this bakery instead.",
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text("Keep Existing"),
            ),
            ElevatedButton(
              onPressed: () {
                appState.addToCart(p, forceClear: true);
                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text("Cart cleared and item added!")),
                );
              },
              style: ElevatedButton.styleFrom(backgroundColor: Colors.orange[800]),
              child: const Text("Clear & Add"),
            ),
          ],
        ),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Added item to cart!")),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final appState = Provider.of<AppState>(context);

    return FutureBuilder<Bakery?>(
      future: _firebaseService.getBakery(widget.bakeryId),
      builder: (context, bakerySnap) {
        if (bakerySnap.connectionState == ConnectionState.waiting) {
          return const Scaffold(body: Center(child: CircularProgressIndicator()));
        }
        final bakery = bakerySnap.data;
        if (bakery == null) {
          return const Scaffold(body: Center(child: Text("Bakery details not found.")));
        }

        return Scaffold(
          backgroundColor: const Color(0xFFFAF9F6),
          body: NestedScrollView(
            headerSliverBuilder: (context, innerBoxIsScrolled) {
              return [
                SliverAppBar(
                  expandedHeight: 200,
                  floating: false,
                  pinned: true,
                  backgroundColor: Colors.orange[800],
                  flexibleSpace: FlexibleSpaceBar(
                    title: Text(
                      bakery.name,
                      style: const TextStyle(
                        fontFamily: 'SpaceGrotesk',
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                        shadows: [Shadow(color: Colors.black45, blurRadius: 4)],
                      ),
                    ),
                    background: Stack(
                      fit: StackFit.expand,
                      children: [
                        Image.network(bakery.imageUrl, fit: BoxFit.cover),
                        Container(color: Colors.black26),
                      ],
                    ),
                  ),
                  actions: [
                    IconButton(
                      icon: Icon(
                        appState.profile?.favorites.contains(bakery.id) ?? false
                            ? Icons.favorite
                            : Icons.favorite_border,
                        color: Colors.red,
                      ),
                      onPressed: () => appState.toggleFavorites(bakery.id),
                    ),
                  ],
                ),
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          bakery.description,
                          style: TextStyle(fontSize: 14, color: Colors.stone[700]),
                        ),
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            const Icon(Icons.star, color: Colors.amber, size: 18),
                            const SizedBox(width: 4),
                            Text("${bakery.rating}", style: const TextStyle(fontWeight: FontWeight.bold)),
                            const SizedBox(width: 24),
                            const Icon(Icons.access_time_rounded, color: Colors.stone, size: 16),
                            const SizedBox(width: 4),
                            Text(bakery.deliveryTime, style: const TextStyle(fontWeight: FontWeight.w500)),
                            const SizedBox(width: 24),
                            const Icon(Icons.delivery_dining, color: Colors.green, size: 18),
                            const SizedBox(width: 4),
                            Text(
                              bakery.deliveryFee == 0 ? "Free" : "\$${bakery.deliveryFee.toStringAsFixed(2)}",
                              style: const TextStyle(fontWeight: FontWeight.bold),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
                SliverPersistentHeader(
                  pinned: true,
                  delegate: _SliverTabAppBarDelegate(
                    TabBar(
                      controller: _tabController,
                      isScrollable: true,
                      labelColor: Colors.orange[800],
                      unselectedLabelColor: Colors.stone[600],
                      indicatorColor: Colors.orange[800],
                      indicatorWeight: 3,
                      tabs: _categories.map((c) => Tab(text: c)).toList(),
                    ),
                  ),
                ),
              ];
            },
            body: TabBarView(
              controller: _tabController,
              children: _categories.map((category) {
                return StreamBuilder<List<Product>>(
                  stream: _firebaseService.streamBakeryProducts(widget.bakeryId),
                  builder: (context, prodSnap) {
                    if (prodSnap.connectionState == ConnectionState.waiting) {
                      return const Center(child: CircularProgressIndicator());
                    }
                    final products = prodSnap.data ?? [];
                    final filtered = category == 'All'
                        ? products
                        : products.where((p) => p.category.toLowerCase() == category.toLowerCase()).toList();

                    if (filtered.isEmpty) {
                      return const Center(
                        child: Text("No products available in this category.", style: TextStyle(color: Colors.stone)),
                      );
                    }

                    return ListView.builder(
                      padding: const EdgeInsets.all(16),
                      itemCount: filtered.length,
                      itemBuilder: (context, idx) {
                        final product = filtered[idx];
                        return _buildProductListTile(product, appState);
                      },
                    );
                  },
                );
              }).toList(),
            ),
          ),
          bottomNavigationBar: appState.cart.isNotEmpty
              ? SafeArea(
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    color: Colors.white,
                    child: ElevatedButton(
                      onPressed: () => Navigator.pushNamed(context, '/cart'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.orange[800],
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.shopping_bag_outlined, color: Colors.white),
                          const SizedBox(width: 8),
                          Text(
                            "View Cart (${appState.cart.length} items) • \$${appState.cartSubtotal.toStringAsFixed(2)}",
                            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16),
                          ),
                        ],
                      ),
                    ),
                  ),
                )
              : null,
        );
      },
    );
  }

  Widget _buildProductListTile(Product p, AppState appState) {
    final cartItem = appState.cart.firstWhere((item) => item.id == p.id,
        orElse: () => OrderItem(id: '', name: '', price: 0, quantity: 0, imageUrl: '', bakeryId: ''));

    return Card(
      color: Colors.white,
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      elevation: 1,
      child: Padding(
        padding: const EdgeInsets.all(12.0),
        child: Row(
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: Image.network(
                p.imageUrl,
                width: 72,
                height: 72,
                fit: BoxFit.cover,
                errorBuilder: (c, e, s) => Container(color: Colors.orange[50]),
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    p.name,
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    p.description,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(color: Colors.stone[600], fontSize: 12),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    "\$${p.price.toStringAsFixed(2)}",
                    style: TextStyle(fontWeight: FontWeight.bold, color: Colors.orange[800], fontSize: 14),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 12),
            if (p.stockQuantity <= 0)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(color: Colors.red[50], borderRadius: BorderRadius.circular(6)),
                child: const Text("Out of Stock", style: TextStyle(color: Colors.red, fontSize: 11, fontWeight: FontWeight.bold)),
              )
            else if (cartItem.id.isEmpty)
              IconButton(
                icon: Icon(Icons.add_circle, color: Colors.orange[800], size: 30),
                onPressed: () => _handleAddToCart(p, appState),
              )
            else
              Row(
                children: [
                  IconButton(
                    icon: Icon(Icons.remove_circle_outline, color: Colors.stone[600], size: 24),
                    onPressed: () => appState.updateCartQuantity(p.id, cartItem.quantity - 1),
                  ),
                  Text(
                    "${cartItem.quantity}",
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                  ),
                  IconButton(
                    icon: Icon(Icons.add_circle, color: Colors.orange[800], size: 24),
                    onPressed: () {
                      if (cartItem.quantity + 1 > p.stockQuantity) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text("Insufficient stock available.")),
                        );
                      } else {
                        appState.updateCartQuantity(p.id, cartItem.quantity + 1);
                      }
                    },
                  ),
                ],
              ),
          ],
        ),
      ),
    );
  }
}

class _SliverTabAppBarDelegate extends SliverPersistentHeaderDelegate {
  final TabBar _tabBar;

  _SliverTabAppBarDelegate(this._tabBar);

  @override
  double get minExtent => _tabBar.preferredSize.height;
  @override
  double get maxExtent => _tabBar.preferredSize.height;

  @override
  Widget build(BuildContext context, double shrinkOffset, bool overlapsContent) {
    return Container(
      color: Colors.white,
      child: _tabBar,
    );
  }

  @override
  bool shouldRebuild(_SliverTabAppBarDelegate oldDelegate) {
    return false;
  }
}
