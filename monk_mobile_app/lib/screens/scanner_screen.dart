import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:multicast_dns/multicast_dns.dart';
import 'dashboard_screen.dart';

class ScannerScreen extends StatefulWidget {
  const ScannerScreen({super.key});

  @override
  State<ScannerScreen> createState() => _ScannerScreenState();
}

class _ScannerScreenState extends State<ScannerScreen> {
  bool _isProcessing = false;

  void _onDetect(BarcodeCapture capture) async {
    if (_isProcessing) return;
    
    final List<Barcode> barcodes = capture.barcodes;
    for (final barcode in barcodes) {
      if (barcode.rawValue != null) {
        final String rawCode = barcode.rawValue!;
        
        // Expected format: monkapp://setup?ip=192.168.1.5&port=8000&secure=true
          if (rawCode.startsWith('monkapp://setup')) {
          print("MATCHED MONK PROTOCOL!");
          setState(() { _isProcessing = true; });
          
          try {
            final Uri uri = Uri.parse(rawCode);
            final String? ip = uri.queryParameters['ip'];
            
            print("EXTRACTED IP: $ip");

            if (ip != null) {
              // Save to local storage
              final prefs = await SharedPreferences.getInstance();
              await prefs.setString('monk_ip', ip);
              print("SAVED IP, ROUTING TO DASH...");
              
              if (!mounted) return;
              
              // Navigate to dashboard
              Navigator.of(context).pushReplacement(
                MaterialPageRoute(builder: (context) => DashboardScreen(robotIp: ip)),
              );
              return;
            }
          } catch (e) {
            print("QR PARSE ERROR: $e");
            // Invalid URI parse
            setState(() { _isProcessing = false; });
          }
        } else {
            print("SCANNED RAW (NOT MONK): $rawCode");
        }
      }
    }
  }

  // mDNS Zero-Touch Discovery
  Future<void> _discoverMDNS() async {
    setState(() { _isProcessing = true; });
    
    // We inform the user we are searching...
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Searching for Monk OS on local network...')),
    );

    final MDnsClient client = MDnsClient();
    try {
      await client.start();
      print("[mDNS] Broadcasting for _http._tcp.local");
      
      String? discoveredIp;
      
      // Look for the generic HTTP service.
      await for (final PtrResourceRecord ptr in client.lookup<PtrResourceRecord>(
          ResourceRecordQuery.serverPointer('_http._tcp.local'))) {
            
        // If the service matches our expected hostname (usually monkos or raspberrypi)
        // Avahi defaults to hostname.local
        if (ptr.domainName.toLowerCase().contains('monk')) {
            await for (final SrvResourceRecord srv in client.lookup<SrvResourceRecord>(
                ResourceRecordQuery.service(ptr.domainName))) {
                
                // Get the A record which contains the actual IPv4 address
                await for (final IPAddressResourceRecord ip in client.lookup<IPAddressResourceRecord>(
                    ResourceRecordQuery.addressIPv4(srv.target))) {
                    
                    discoveredIp = ip.address.address;
                    print("[mDNS] FOUND MONK OS AT: \$discoveredIp");
                    break;
                }
                if (discoveredIp != null) break;
            }
        }
        if (discoveredIp != null) break;
      }
      
      client.stop();
      
      if (discoveredIp != null) {
          final prefs = await SharedPreferences.getInstance();
          await prefs.setString('monk_ip', discoveredIp);
          
          if (!mounted) return;
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Found Monk OS at \$discoveredIp!')),
          );
          
          Navigator.of(context).pushReplacement(
            MaterialPageRoute(builder: (context) => DashboardScreen(robotIp: discoveredIp!)),
          );
      } else {
          if (!mounted) return;
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Could not find Monk OS automatically. Try scanning the QR code.')),
          );
          setState(() { _isProcessing = false; });
      }

    } catch (e) {
      client.stop();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('mDNS Error: \$e')),
      );
      setState(() { _is   = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Pair with Monk OS', style: TextStyle(color: Color(0xFF00ffcc))),
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      body: Stack(
        children: [
          MobileScanner(
            onDetect: _onDetect,
            controller: MobileScannerController(
              detectionSpeed: DetectionSpeed.normal,
              facing: CameraFacing.back,
            ),
          ),
          // Overlay UI
          Center(
            child: Container(
              width: 250,
              height: 250,
              decoration: BoxDecoration(
                border: Border.all(color: const Color(0xFF00ffcc), width: 3),
                borderRadius: BorderRadius.circular(20),
              ),
            ),
          ),
          const Positioned(
            bottom: 120,
            left: 0,
            right: 0,
            child: Text(
              'Scan the QR Code on the Robot\'s Tablet',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
            ),
          ),
          Positioned(
            bottom: 40,
            left: 30,
            right: 30,
            child: ElevatedButton.icon(
              onPressed: _isProcessing ? null : _discoverMDNS,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF00ffcc),
                foregroundColor: Colors.black,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              icon: _isProcessing 
                  ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.black, strokeWidth: 2))
                  : const Icon(Icons.wifi_tethering),
              label: Text(
                _isProcessing ? 'Searching mDNS...' : 'Auto-Discover Robot',
                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
              ),
            ),
          )
        ],
      ),
    );
  }
}
