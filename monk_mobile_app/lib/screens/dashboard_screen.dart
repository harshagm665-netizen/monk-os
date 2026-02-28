import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import 'scanner_screen.dart';

class DashboardScreen extends StatefulWidget {
  final String robotIp;

  const DashboardScreen({super.key, required this.robotIp});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  String _status = "Checking Status...";
  bool _isConnected = false;

  @override
  void initState() {
    super.initState();
    _checkConnection();
  }

  Future<void> _checkConnection() async {
    try {
      final response = await http.get(Uri.parse('http://${widget.robotIp}:5173/api/hardware/status')).timeout(const Duration(seconds: 3));
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        setState(() {
          _isConnected = data['connected'] ?? false;
          _status = _isConnected ? "Linked to ${widget.robotIp}" : "Arduino Not Responding";
        });
      } else {
        setState(() => _status = "API Error: ${response.statusCode}");
      }
    } catch (e) {
      setState(() {
        _isConnected = false;
        _status = "Connection Failed. Is the Robot on?";
      });
    }
  }

  Future<void> _sendCommand(String cmd) async {
    try {
      final response = await http.post(
        Uri.parse('http://${widget.robotIp}:5173/api/hardware/execute'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'command': cmd}),
      ).timeout(const Duration(seconds: 2));

      if (response.statusCode == 200) {
        setState(() => _status = "Command Sent: [${cmd.toUpperCase()}]"); // Quick UI feedback
      } else {
        setState(() => _status = "Execution Error");
      }
    } catch (e) {
      setState(() => _status = "Network Error");
    }
  }

  void _unpair() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('monk_ip');
    if (!mounted) return;
    Navigator.of(context).pushReplacement(
      MaterialPageRoute(builder: (context) => const ScannerScreen()),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Monk OS Link', style: TextStyle(color: Color(0xFF00ffcc))),
        backgroundColor: const Color(0xFF0a0c10),
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.link_off, color: Color(0xFFff3366)),
            onPressed: _unpair,
            tooltip: 'Unpair Robot',
          )
        ],
      ),
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [Color(0xFF0a0c10), Color(0xFF141824)],
          ),
        ),
        child: Column(
          children: [
            // Status Bar
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
              margin: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.05),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: Colors.white.withOpacity(0.1)),
              ),
              child: Row(
                children: [
                  Container(
                    width: 12, height: 12,
                    decoration: BoxDecoration(
                      color: _isConnected ? const Color(0xFF00ffcc) : const Color(0xFFff3366),
                      shape: BoxShape.circle,
                      boxShadow: [
                        BoxShadow(
                          color: _isConnected ? const Color(0xFF00ffcc).withOpacity(0.5) : const Color(0xFFff3366).withOpacity(0.5),
                          blurRadius: 8,
                        )
                      ]
                    ),
                  ),
                  const SizedBox(width: 15),
                  Expanded(
                    child: Text(
                      _status,
                      style: TextStyle(color: _isConnected ? const Color(0xFF00ffcc) : const Color(0xFFff3366), fontFamily: 'Courier', fontSize: 12),
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.refresh, color: Colors.white54, size: 20),
                    onPressed: _checkConnection,
                  )
                ],
              ),
            ),

            const SizedBox(height: 20),

            // Base Kinematics (D-PAD)
            const Text("BASE KINEMATICS", style: TextStyle(color: Colors.white54, letterSpacing: 2, fontSize: 12)),
            const SizedBox(height: 20),
            
            SizedBox(
              height: 220,
              width: 220,
              child: Stack(
                children: [
                  Positioned(top: 0, left: 70, child: _buildDirBtn(Icons.arrow_upward, 'bf')),
                  Positioned(bottom: 0, left: 70, child: _buildDirBtn(Icons.arrow_downward, 'bb')),
                  Positioned(top: 70, left: 0, child: _buildDirBtn(Icons.arrow_back, 'bl')),
                  Positioned(top: 70, right: 0, child: _buildDirBtn(Icons.arrow_forward, 'br')),
                  Positioned(top: 70, left: 70, child: _buildStopBtn()),
                ],
              ),
            ),

            const SizedBox(height: 40),

            // Aux Controls
            const Text("AUXILIARY", style: TextStyle(color: Colors.white54, letterSpacing: 2, fontSize: 12)),
            const SizedBox(height: 15),
            
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  _buildSequenceBtn("DANCE", 'dance start', Icons.graphic_eq, const Color(0xFFffcc00)),
                  _buildSequenceBtn("HEAD UP", 'xf', Icons.visibility, Colors.white),
                  _buildSequenceBtn("HANDS", 'hf', Icons.front_hand, Colors.white),
                ],
              ),
            )
          ],
        ),
      ),
    );
  }

  Widget _buildDirBtn(IconData icon, String cmd) {
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: () => _sendCommand(cmd),
      onTapDown: (_) => _sendCommand(cmd),
      child: Container(
        width: 80, height: 80,
        decoration: BoxDecoration(
          color: const Color(0xFF00ffcc).withOpacity(0.1),
          borderRadius: BorderRadius.circular(15),
          border: Border.all(color: const Color(0xFF00ffcc).withOpacity(0.3)),
        ),
        child: Icon(icon, color: const Color(0xFF00ffcc), size: 36),
      ),
    );
  }

  Widget _buildStopBtn() {
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: () => _sendCommand('s'),
      onTapDown: (_) => _sendCommand('s'),
      child: Container(
        width: 80, height: 80,
        decoration: BoxDecoration(
          color: const Color(0xFFff3366).withOpacity(0.2),
          borderRadius: BorderRadius.circular(15),
          border: Border.all(color: const Color(0xFFff3366).withOpacity(0.5)),
        ),
        child: const Icon(Icons.stop, color: Color(0xFFff3366), size: 36),
      ),
    );
  }

  Widget _buildSequenceBtn(String label, String cmd, IconData icon, Color color) {
    return GestureDetector(
      onTap: () => _sendCommand(cmd),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 20),
        decoration: BoxDecoration(
          color: color.withOpacity(0.1),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: color.withOpacity(0.3)),
        ),
        child: Column(
          children: [
            Icon(icon, color: color, size: 24),
            const SizedBox(height: 5),
            Text(label, style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.bold)),
          ],
        ),
      ),
    );
  }
}
