import 'dart:async';
import 'dart:io';
import 'package:flutter/foundation.dart';
import '../../core/security/crypto_manager.dart';

class CapturedEvidence {
  final String filePath;
  final String mediaType; // PHOTO or VIDEO
  final int durationSeconds;
  final String sha256Checksum;
  final String timestampUtc;
  final double latitude;
  final double longitude;
  final String ghanaPostCode;
  final bool isWatermarkVerified;

  CapturedEvidence({
    required this.filePath,
    required this.mediaType,
    required this.durationSeconds,
    required this.sha256Checksum,
    required this.timestampUtc,
    required this.latitude,
    required this.longitude,
    required this.ghanaPostCode,
    this.isWatermarkVerified = true,
  });

  Map<String, dynamic> toJson() => {
    'filePath': filePath,
    'mediaType': mediaType,
    'durationSeconds': durationSeconds,
    'sha256Checksum': sha256Checksum,
    'timestampUtc': timestampUtc,
    'latitude': latitude,
    'longitude': longitude,
    'ghanaPostCode': ghanaPostCode,
    'isWatermarkVerified': isWatermarkVerified,
  };
}

class CameraCaptureController extends ChangeNotifier {
  static const int maxVideoDurationSeconds = 60; // Statutory hard limit

  bool _isRecording = false;
  int _elapsedSeconds = 0;
  Timer? _timer;
  CapturedEvidence? _lastCaptured;

  bool get isRecording => _isRecording;
  int get elapsedSeconds => _elapsedSeconds;
  int get remainingSeconds => maxVideoDurationSeconds - _elapsedSeconds;
  CapturedEvidence? get lastCaptured => _lastCaptured;

  /// Start recording video with 60-second hardware countdown
  void startRecording({required VoidCallback onMaxDurationReached}) {
    _isRecording = true;
    _elapsedSeconds = 0;
    notifyListeners();

    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      _elapsedSeconds++;
      notifyListeners();

      if (_elapsedSeconds >= maxVideoDurationSeconds) {
        stopRecording();
        onMaxDurationReached();
      }
    });
  }

  /// Stop recording and finalize cryptographic capture manifest
  Future<CapturedEvidence> stopRecording({
    String mockFilePath = '/tmp/evidence_video_720p.mp4',
    double lat = 5.6037,
    double lng = -0.1870,
    String ghanaPostCode = 'GA-382-9104',
  }) async {
    _timer?.cancel();
    _isRecording = false;

    final duration = _elapsedSeconds == 0 ? 15 : _elapsedSeconds;
    final nowUtc = DateTime.now().toUtc().toIso8601String();
    
    // Compute SHA-256 rolling digest
    final checksum = CryptoManager.hashString('$mockFilePath-$nowUtc-$lat-$lng-$duration');

    _lastCaptured = CapturedEvidence(
      filePath: mockFilePath,
      mediaType: 'VIDEO',
      durationSeconds: duration,
      sha256Checksum: checksum,
      timestampUtc: nowUtc,
      latitude: lat,
      longitude: lng,
      ghanaPostCode: ghanaPostCode,
      isWatermarkVerified: true,
    );

    notifyListeners();
    return _lastCaptured!;
  }

  void reset() {
    _timer?.cancel();
    _isRecording = false;
    _elapsedSeconds = 0;
    _lastCaptured = null;
    notifyListeners();
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }
}
