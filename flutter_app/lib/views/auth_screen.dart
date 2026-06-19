import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/app_state.dart';
import '../models/models.dart';

class AuthScreen extends StatefulWidget {
  const AuthScreen({Key? key}) : super(key: key);

  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _nameController = TextEditingController();
  final _phoneController = TextEditingController();

  bool _isLogin = true;
  bool _isForgotPassword = false;
  bool _resetSent = false;
  UserRole _selectedRole = UserRole.customer;

  void _showSnackBar(String msg, {bool isError = false}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(msg),
        backgroundColor: isError ? Colors.red[800] : Colors.green[800],
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
    );
  }

  Future<void> _handleSubmit() async {
    if (!_formKey.currentState!.validate()) return;

    final appState = Provider.of<AppState>(context, listen: false);

    try {
      if (_isForgotPassword) {
        await appState.resetPassword(_emailController.text.trim());
        setState(() {
          _resetSent = true;
        });
        _showSnackBar("Password reset email sent successfully!");
      } else if (_isLogin) {
        await appState.login(
          _emailController.text.trim(),
          _passwordController.text,
        );
        _showSnackBar("Logged in successfully!");
      } else {
        await appState.register(
          email: _emailController.text.trim(),
          password: _passwordController.text,
          name: _nameController.text.trim(),
          phone: _phoneController.text.trim(),
          role: _selectedRole,
        );
        _showSnackBar("Verification email sent! Please verify to sign in.");
        setState(() {
          _isLogin = true;
        });
      }
    } catch (e) {
      String errMsg = "An error occurred. Please try again.";
      if (e.toString().contains('user-not-found')) {
        errMsg = "No user found for that email.";
      } else if (e.toString().contains('wrong-password')) {
        errMsg = "Wrong password provided.";
      } else if (e.toString().contains('email-already-in-use')) {
        errMsg = "The account already exists for that email.";
      } else if (e.toString().contains('invalid-email')) {
        errMsg = "Please enter a valid email address.";
      } else if (e.toString().contains('operation-not-allowed')) {
        errMsg = "Password reset is not enabled. Contact support.";
      }
      _showSnackBar(errMsg, isError: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    final appState = Provider.of<AppState>(context);

    return Scaffold(
      backgroundColor: const Color(0xFFFAF9F6), // Warm Cream
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24.0),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 400),
            child: Form(
              key: _formKey,
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // App Icon / Logo Accent
                  Icon(
                    Icons.bakery_dining_rounded,
                    size: 80,
                    color: Colors.orange[800],
                  ),
                  const SizedBox(height: 16),
                  Text(
                    "Samouna Mobile",
                    style: TextStyle(
                      fontSize: 32,
                      fontWeight: FontWeight.bold,
                      fontFamily: "SpaceGrotesk",
                      color: Colors.stone[900],
                    ),
                    textAlign: TextAlign.center,
                  ),
                  Text(
                    "Authentic Iraqi Baking Delivered Hot",
                    style: TextStyle(
                      fontSize: 14,
                      color: Colors.stone[600],
                      fontWeight: FontWeight.w500,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 40),

                  if (_isForgotPassword && _resetSent)
                    _buildResetSentCard()
                  else ...[
                    // Card contents
                    Card(
                      elevation: 4,
                      shadowColor: Colors.black26,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(24),
                      ),
                      color: Colors.white,
                      child: Padding(
                        padding: const EdgeInsets.all(24.0),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            Text(
                              _isForgotPassword
                                  ? "Forgot Password"
                                  : _isLogin
                                      ? "Sign In"
                                      : "Create Account",
                              style: const TextStyle(
                                fontSize: 20,
                                fontWeight: FontWeight.bold,
                              ),
                              textAlign: TextAlign.center,
                            ),
                            const SizedBox(height: 24),

                            if (!_isLogin && !_isForgotPassword) ...[
                              _buildTextField(
                                controller: _nameController,
                                label: "Full Name",
                                icon: Icons.person_outline,
                                validator: (value) => value == null || value.isEmpty
                                    ? "Please enter your name"
                                    : null,
                              ),
                              const SizedBox(height: 16),
                              _buildTextField(
                                controller: _phoneController,
                                label: "Phone Number",
                                icon: Icons.phone_outlined,
                                keyboardType: TextInputType.phone,
                                validator: (value) => value == null || value.isEmpty
                                    ? "Please enter your phone number"
                                    : null,
                              ),
                              const SizedBox(height: 16),
                              _buildRoleSelector(),
                              const SizedBox(height: 16),
                            ],

                            _buildTextField(
                              controller: _emailController,
                              label: "Email Address",
                              icon: Icons.mail_outline,
                              keyboardType: TextInputType.emailAddress,
                              validator: (value) {
                                if (value == null || value.isEmpty) {
                                  return "Please enter your email";
                                }
                                if (!RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$')
                                    .hasMatch(value)) {
                                  return "Please enter a valid email address.";
                                }
                                return null;
                              },
                            ),

                            if (!_isForgotPassword) ...[
                              const SizedBox(height: 16),
                              _buildTextField(
                                controller: _passwordController,
                                label: "Password",
                                icon: Icons.lock_outline,
                                isObscure: true,
                                validator: (value) => value == null || value.length < 6
                                    ? "Password must be at least 6 characters"
                                    : null,
                              ),
                            ],

                            if (_isLogin && !_isForgotPassword)
                              Align(
                                alignment: Alignment.centerRight,
                                child: TextButton(
                                  onPressed: () {
                                    setState(() {
                                      _isForgotPassword = true;
                                    });
                                  },
                                  child: Text(
                                    "Forgot Password?",
                                    style: TextStyle(
                                      color: Colors.orange[800],
                                      fontWeight: FontWeight.bold,
                                      fontSize: 12,
                                    ),
                                  ),
                                ),
                              ),

                            const SizedBox(height: 24),
                            ElevatedButton(
                              onPressed: appState.isLoading ? null : _handleSubmit,
                              style: ElevatedButton.styleFrom(
                                backgroundColor: Colors.orange[800],
                                foregroundColor: Colors.white,
                                padding: const EdgeInsets.symmetric(vertical: 14),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(12),
                                ),
                              ),
                              child: appState.isLoading
                                  ? const SizedBox(
                                      height: 20,
                                      width: 20,
                                      child: CircularProgressIndicator(
                                        color: Colors.white,
                                        strokeWidth: 2,
                                      ),
                                    )
                                  : Text(
                                      _isForgotPassword
                                          ? "Send Reset Email"
                                          : _isLogin
                                              ? "Sign In"
                                              : "Sign Up",
                                      style: const TextStyle(
                                        fontSize: 16,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    TextButton(
                      onPressed: () {
                        setState(() {
                          if (_isForgotPassword) {
                            _isForgotPassword = false;
                          } else {
                            _isLogin = !_isLogin;
                          }
                        });
                      },
                      child: Text(
                        _isForgotPassword
                            ? "Back to Login"
                            : _isLogin
                                ? "Don't have an account? Sign Up"
                                : "Already have an account? Sign In",
                        style: TextStyle(
                          color: Colors.stone[700],
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String label,
    required IconData icon,
    bool isObscure = false,
    TextInputType keyboardType = TextInputType.text,
    String? Function(String?)? validator,
  }) {
    return TextFormField(
      controller: controller,
      obscureText: isObscure,
      keyboardType: keyboardType,
      validator: validator,
      decoration: InputDecoration(
        labelText: label,
        prefixIcon: Icon(icon, color: Colors.stone[500]),
        filled: true,
        fillColor: const Color(0xFFF7F7F7),
        labelStyle: TextStyle(color: Colors.stone[600], fontSize: 13),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide.none,
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: Colors.orange[800]!),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      ),
    );
  }

  Widget _buildRoleSelector() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          "I want to sign up as a:",
          style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 8),
        DropdownButtonFormField<UserRole>(
          value: _selectedRole,
          decoration: InputDecoration(
            filled: true,
            fillColor: const Color(0xFFF7F7F7),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide.none,
            ),
          ),
          items: const [
            DropdownMenuItem(value: UserRole.customer, child: Text("Customer")),
            DropdownMenuItem(value: UserRole.owner, child: Text("Bakery Owner")),
            DropdownMenuItem(value: UserRole.driver, child: Text("Delivery Driver")),
          ],
          onChanged: (role) {
            if (role != null) {
              setState(() => _selectedRole = role);
            }
          },
        ),
      ],
    );
  }

  Widget _buildResetSentCard() {
    return Card(
      elevation: 4,
      shadowColor: Colors.black12,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      color: Colors.white,
      child: Padding(
        padding: const EdgeInsets.all(28.0),
        child: Column(
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.green[50],
                shape: BoxShape.circle,
              ),
              child: Icon(
                Icons.check_circle_outline_rounded,
                color: Colors.green[700],
                size: 48,
              ),
            ),
            const SizedBox(height: 24),
            const Text(
              "Check Your Inbox",
              style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 12),
            Text(
              "A password reset link has been successfully sent to:\n${_emailController.text}",
              style: TextStyle(color: Colors.stone[700], fontSize: 14, height: 1.4),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 6),
            const Text(
              "Be sure to check your spam folder if you do not receive the email in a few minutes.",
              style: TextStyle(color: Colors.stone[500], fontSize: 11, height: 1.4),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: () {
                setState(() {
                  _resetSent = false;
                  _isForgotPassword = false;
                });
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.green[700],
                foregroundColor: Colors.white,
                minimumSize: const Size(double.infinity, 44),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              child: const Text("Back to Sign In", style: TextStyle(fontWeight: FontWeight.bold)),
            ),
            const SizedBox(height: 8),
            OutlinedButton(
              onPressed: () {
                setState(() {
                  _resetSent = false;
                });
              },
              style: OutlinedButton.styleFrom(
                side: BorderSide(color: Colors.green[200]!),
                foregroundColor: Colors.green[800],
                minimumSize: const Size(double.infinity, 40),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              child: const Text("Send to another email"),
            ),
          ],
        ),
      ),
    );
  }
}
