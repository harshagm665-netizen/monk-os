import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'screens/scanner_screen.dart';
import 'screens/dashboard_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final prefs = await SharedPreferences.getInstance();
  final String? savedIp = prefs.getString('monk_ip');

  runApp(MonkMobileApp(initialIp: savedIp));
}

class MonkMobileApp extends StatelessWidget {
  final String? initialIp;

  const MonkMobileApp({super.key, this.initialIp});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Monk OS Controller',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        brightness: Brightness.dark,
        scaffoldBackgroundColor: const Color(0xFF0a0c10),
        primaryColor: const Color(0xFF00ffcc),
        colorScheme: const ColorScheme.dark(
          primary: Color(0xFF00ffcc),
          secondary: Color(0xFFff3366),
        ),
        fontFamily: 'Inter',
      ),
      home: initialIp != null 
          ? DashboardScreen(robotIp: initialIp!) 
          : const ScannerScreen(),
    );
  }
}
