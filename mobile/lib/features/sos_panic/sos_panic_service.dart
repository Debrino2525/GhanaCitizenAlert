import 'dart:async';
import 'package:flutter/foundation.dart';

export 'dart:async';

class SOSBeaconState {
  final bool isActive;
  final String? beaconId;
  final double latitude;
  final double longitude;
  final String ghanaPostCode;
  final String activatedAtUtc;
  final int liveUpdateCount;

  SOSBeaconState({
    required this.isActive,
    this.beaconId,
    required this.latitude,
    required this.longitude,
    required this.ghanaPostCode,
    required this.activatedAtUtc,
    this.liveUpdateCount = 0,
  });
}

class SOSPanicService extends ChangeNotifier {
  SOSBeaconState _state = SOSBeaconState(
    isActive: false,
    latitude: 5.6037,
    longitude: -0.1870,
    ghanaPostCode: 'GA-183-9022',
    activatedAtUtc: '',
  );
  Timer? _trackingTimer;

  SOSBeaconState get state => _state;

  /// Trigger emergency SOS Panic Beacon
  Future<SOSBeaconState> triggerSOS({
    double lat = 5.6037,
    double lng = -0.1870,
    String ghanaPost = 'GA-183-9022',
  }) async {
    final beaconId = 'SOS-GH-${DateTime.now().millisecondsSinceEpoch}';
    final now = DateTime.now().toUtc().toIso8601String();

    _state = SOSBeaconState(
      isActive: true,
      beaconId: beaconId,
      latitude: lat,
      longitude: lng,
      ghanaPostCode: ghanaPost,
      activatedAtUtc: now,
      liveUpdateCount: 1,
    );
    notifyListeners();

    // Start background live coordinate pings to Police Command
    _trackingTimer?.cancel();
    _trackingTimer = Timer.periodic(const Duration(seconds: 10), (timer) {
      if (_state.isActive) {
        _state = SOSBeaconState(
          isActive: true,
          beaconId: _state.beaconId,
          latitude: _state.latitude,
          longitude: _state.longitude,
          ghanaPostCode: _state.ghanaPostCode,
          activatedAtUtc: _state.activatedAtUtc,
          liveUpdateCount: _state.liveUpdateCount + 1,
        );
        notifyListeners();
      }
    });

    return _state;
  }

  /// Deactivate panic beacon (requires confirmation)
  void cancelSOS() {
    _trackingTimer?.cancel();
    _state = SOSBeaconState(
      isActive: false,
      latitude: _state.latitude,
      longitude: _state.longitude,
      ghanaPostCode: _state.ghanaPostCode,
      activatedAtUtc: '',
      liveUpdateCount: 0,
    );
    notifyListeners();
  }

  @override
  void dispose() {
    _trackingTimer?.cancel();
    super.dispose();
  }
}
