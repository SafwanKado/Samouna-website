import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/app_state.dart';
import '../models/models.dart';
import '../services/firebase_service.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({Key? key}) : super(key: key);

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final FirebaseService _firebaseService = FirebaseService();
  String _searchQuery = "";

  // Mock translation dictionaries to mimic LanguageContext
  final Map<String, Map<String, String>> _translations = {
    'en': {
      'heroTitle': 'Fresh Samoon Delivered',
      'heroSub': 'Authentic Iraqi bakeries delivered within minutes.',
      'search': 'Search for bakeries...',
      'favorites': 'Your Favorites',
      'allBakeries': 'Explore Bakeries',
      'closed': 'Closed',
      'min': 'min',
      'free': 'Free Delivery',
      'noBakeries': 'No bakeries matching your criteria.'
    },
    'ar': {
      'heroTitle': 'صمون طازج يصلك دافئاً',
      'heroSub': 'مخابز عراقية أصيلة تصلك خلال دقائق معدودة.',
      'search': 'البحث عن المخابز...',
      'favorites': 'المفضلة لديك',
      'allBakeries': 'استكشف المخابز',
      'closed': 'مغلق حالياً',
      'min': 'دقيقة',
      'free': 'توصيل مجاني',
      'noBakeries': 'لا توجد مخابز مطابقة للبحث.'
    },
    'ku': {
      'heroTitle': 'سەموونێ گەرم گەهیشت',
      'heroSub': 'نانپێژێن عێراقی یێن ڕاستەقینە د چەند خۆلەکا دا داهێن.',
      'search': 'ل نانپێژا بگەرێ...',
      'favorites': 'دلخوازێن تە',
      'allBakeries': 'گەڕیان ل نانپێژا',
      'closed': 'داخراوە',
      'min': 'خۆلەک',
      'free': 'گواستنەوەی خۆڕایی',
      'noBakeries': 'چ نانپێژ نەهاتنە دیتن.'
    }
  };

  String _t(String key, String langCode) {
    return _translations[langCode]?[key] ?? _translations['en']![key]!;
  }

  @override
  Widget build(BuildContext context) {
    final appState = Provider.of<AppState>(context);
    final lang = appState.languageCode;

    return Scaffold(
      backgroundColor: const Color(0xFFFAF9F6),
      appBar: AppBar(
        title: Text(
          appState.profile?.role == UserRole.customer
              ? "Samouna Delivery"
              : "Samouna: ${appState.profile?.role.name.toUpperCase()}",
          style: const TextStyle(fontWeight: FontWeight.bold, fontFamily: 'SpaceGrotesk'),
        ),
        backgroundColor: Colors.white,
        elevation: 0,
        actions: [
          _buildLanguageMenu(appState),
          IconButton(
            icon: const Icon(Icons.person_outline),
            onPressed: () => Navigator.pushNamed(context, '/profile'),
          ),
          if (appState.profile?.role == UserRole.customer)
            IconButton(
              icon: Stack(
                children: [
                  const Icon(Icons.shopping_bag_outlined),
                  if (appState.cart.isNotEmpty)
                    Positioned(
                      right: 0,
                      top: 0,
                      child: CircleAvatar(
                        radius: 6,
                        backgroundColor: Colors.orange[800],
                        child: Text(
                          "${appState.cart.length}",
                          style: const TextStyle(fontSize: 8, color: Colors.white, fontWeight: FontWeight.bold),
                        ),
                      ),
                    ),
                ],
              ),
              onPressed: () => Navigator.pushNamed(context, '/cart'),
            ),
        ],
      ),
      body: StreamBuilder<List<Bakery>>(
        stream: _firebaseService.streamActiveBakeries(),
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return Center(child: Text("Error: ${snapshot.error}"));
          }

          final bakeries = snapshot.data ?? [];
          final filtered = bakeries
              .where((b) => b.name.toLowerCase().contains(_searchQuery.toLowerCase()))
              .toList();

          final favorites = bakeries
              .where((b) => appState.profile?.favorites.contains(b.id) ?? false)
              .toList();

          return ListView(
            padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 20.0),
            children: [
              // Hero Banner Widget
              _buildHero(lang),
              const SizedBox(height: 16),

              // Search Bar input representation
              _buildSearchBar(lang),
              const SizedBox(height: 24),

              // Favorites Section
              if (favorites.isNotEmpty) ...[
                Text(
                  _t('favorites', lang),
                  style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 12),
                SizedBox(
                  height: 150,
                  child: ListView.builder(
                    scrollDirection: Axis.horizontal,
                    itemCount: favorites.length,
                    itemBuilder: (context, idx) {
                      final bakery = favorites[idx];
                      return _buildFavoriteCard(bakery, appState);
                    },
                  ),
                ),
                const SizedBox(height: 24),
              ],

              // All Bakeries lists
              Text(
                _t('allBakeries', lang),
                style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 12),

              if (filtered.isEmpty)
                Padding(
                  padding: const EdgeInsets.all(40),
                  child: Center(
                    child: Text(
                      _t('noBakeries', lang),
                      style: const TextStyle(color: Colors.stone),
                    ),
                  ),
                )
              else
                ListView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: filtered.length,
                  itemBuilder: (context, idx) {
                    final b = filtered[idx];
                    return _buildBakeryRowCard(b, appState, lang);
                  },
                ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildLanguageMenu(AppState appState) {
    return PopupMenuButton<String>(
      icon: const Icon(Icons.language_rounded),
      onSelected: (code) => appState.setLanguage(code),
      itemBuilder: (context) => const [
        PopupMenuItem(value: 'en', child: Text("English")),
        PopupMenuItem(value: 'ar', child: Text("العربية")),
        PopupMenuItem(value: 'ku', child: Text("کوردی")),
      ],
    );
  }

  Widget _buildHero(String lang) {
    return Container(
      height: 160,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(24),
        gradient: LinearGradient(
          colors: [Colors.orange[900]!, Colors.orange[800]!.withOpacity(0.8)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      child: Stack(
        children: [
          Positioned(
            right: -10,
            bottom: -10,
            child: Opacity(
              opacity: 0.15,
              child: Icon(Icons.bakery_dining_rounded, size: 200, color: Colors.white),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _t('heroTitle', lang),
                  style: const TextStyle(
                    fontSize: 26,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  _t('heroSub', lang),
                  style: const TextStyle(
                    fontSize: 13,
                    color: Color(0xFFFEE8D6),
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSearchBar(String lang) {
    return Card(
      elevation: 4,
      shadowColor: Colors.black12,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: TextField(
        onChanged: (val) {
          setState(() {
            _searchQuery = val;
          });
        },
        decoration: InputDecoration(
          hintText: _t('search', lang),
          prefixIcon: const Icon(Icons.search, color: Colors.stone),
          border: InputBorder.none,
          contentPadding: const EdgeInsets.symmetric(vertical: 16),
        ),
      ),
    );
  }

  Widget _buildFavoriteCard(Bakery b, AppState appState) {
    return GestureDetector(
      onTap: () => Navigator.pushNamed(context, '/bakery', arguments: b.id),
      child: Container(
        width: 140,
        margin: const EdgeInsets.only(right: 12),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          color: Colors.white,
          border: Border.all(color: Colors.stone[100]!),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Expanded(
              child: ClipRRect(
                borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
                child: Image.network(b.imageUrl, fit: BoxFit.cover, errorBuilder: (c, e, s) {
                  return Container(color: Colors.orange[50]);
                }),
              ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    b.name,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                  ),
                  const SizedBox(height: 2),
                  Row(
                    children: [
                      const Icon(Icons.star, color: Colors.amber, size: 12),
                      const SizedBox(width: 2),
                      Text("${b.rating}", style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBakeryRowCard(Bakery b, AppState appState, String lang) {
    final isOpen = b.isOpen();

    return GestureDetector(
      onTap: () => Navigator.pushNamed(context, '/bakery', arguments: b.id),
      child: Container(
        margin: const EdgeInsets.only(bottom: 16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: Colors.stone[100]!),
        ),
        child: Column(
          children: [
            Stack(
              children: [
                ClipRRect(
                  borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
                  child: Image.network(
                    b.imageUrl,
                    height: 140,
                    width: double.infinity,
                    fit: BoxFit.cover,
                  ),
                ),
                Positioned(
                  right: 12,
                  top: 12,
                  child: CircleAvatar(
                    backgroundColor: Colors.white.withOpacity(0.9),
                    child: IconButton(
                      icon: Icon(
                        appState.profile?.favorites.contains(b.id) ?? false
                            ? Icons.favorite
                            : Icons.favorite_border,
                        color: Colors.red,
                      ),
                      onPressed: () => appState.toggleFavorites(b.id),
                    ),
                  ),
                ),
                if (!isOpen)
                  Positioned.fill(
                    child: Container(
                      decoration: BoxDecoration(
                        color: Colors.black54,
                        borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
                      ),
                      alignment: Alignment.center,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                        decoration: BoxDecoration(
                          color: Colors.red[850],
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          _t('closed', lang).toUpperCase(),
                          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
                        ),
                      ),
                    ),
                  ),
              ],
            ),
            Padding(
              padding: const EdgeInsets.all(16.0),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.between,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          b.name,
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          b.description,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(color: Colors.stone[600], fontSize: 12),
                        ),
                      ],
                    ),
                  ),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Row(
                        children: [
                          const Icon(Icons.star, color: Colors.amber, size: 16),
                          const SizedBox(width: 4),
                          Text("${b.rating}", style: const TextStyle(fontWeight: FontWeight.bold)),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          Icon(Icons.access_time_rounded, color: Colors.stone[500], size: 14),
                          const SizedBox(width: 4),
                          Text(
                            "${b.deliveryTime} ${_t('min', lang)}",
                            style: TextStyle(color: Colors.stone[600], fontSize: 11, fontWeight: FontWeight.w500),
                          ),
                        ],
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
