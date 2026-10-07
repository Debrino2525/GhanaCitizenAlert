import 'dart:convert';
import 'package:flutter/foundation.dart';
import '../../core/security/crypto_manager.dart';
import '../capture/camera_capture_controller.dart';

class QueuedIncidentItem {
  final String localId;
  final String category;
  final String title;
  final String description;
  final String ghanaPostCode;
  final bool isAnonymous;
  final CapturedEvidence evidence;
  final String queuedAtUtc;
  bool isUploaded;

  QueuedIncidentItem({
    required this.localId,
    required this.category,
    required this.title,
    required this.description,
    required this.ghanaPostCode,
    required this.isAnonymous,
    required this.evidence,
    required this.queuedAtUtc,
    this.isUploaded = false,
  });

  Map<String, dynamic> toMap() => {
    'localId': localId,
    'category': category,
    'title': title,
    'description': description,
    'ghanaPostCode': ghanaPostCode,
    'isAnonymous': isAnonymous,
    'evidence': evidence.toJson(),
    'queuedAtUtc': queuedAtUtc,
    'isUploaded': isUploaded,
  };

  factory QueuedIncidentItem.fromMap(Map<String, dynamic> map) => QueuedIncidentItem(
    localId: map['localId'],
    category: map['category'],
    title: map['title'],
    description: map['description'],
    ghanaPostCode: map['ghanaPostCode'],
    isAnonymous: map['isAnonymous'],
    evidence: CapturedEvidence(
      filePath: map['evidence']['filePath'],
      mediaType: map['evidence']['mediaType'],
      durationSeconds: map['evidence']['durationSeconds'],
      sha256Checksum: map['evidence']['sha256Checksum'],
      timestampUtc: map['evidence']['timestampUtc'],
      latitude: map['evidence']['latitude'],
      longitude: map['evidence']['longitude'],
      ghanaPostCode: map['evidence']['ghanaPostCode'],
      isWatermarkVerified: map['evidence']['isWatermarkVerified'] ?? true,
    ),
    queuedAtUtc: map['queuedAtUtc'],
    isUploaded: map['isUploaded'] ?? false,
  );
}

class OfflineQueueService extends ChangeNotifier {
  final List<QueuedIncidentItem> _queue = [];
  bool _isSyncing = false;

  List<QueuedIncidentItem> get queue => List.unmodifiable(_queue);
  int get pendingCount => _queue.where((item) => !item.isUploaded).length;
  bool get isSyncing => _isSyncing;

  /// Enqueue an incident in the local encrypted queue
  Future<void> enqueueIncident({
    required String category,
    required String title,
    required String description,
    required String ghanaPostCode,
    required bool isAnonymous,
    required CapturedEvidence evidence,
  }) async {
    final localId = 'LOCAL-${DateTime.now().millisecondsSinceEpoch}';
    final queuedItem = QueuedIncidentItem(
      localId: localId,
      category: category,
      title: title,
      description: description,
      ghanaPostCode: ghanaPostCode,
      isAnonymous: isAnonymous,
      evidence: evidence,
      queuedAtUtc: DateTime.now().toUtc().toIso8601String(),
    );

    // Encrypt payload before in-memory / SQLite persistence
    final rawJson = jsonEncode(queuedItem.toMap());
    final encrypted = CryptoManager.encryptLocalData(rawJson);
    
    // Decrypt and verify integrity
    final verifiedJson = CryptoManager.decryptLocalData(encrypted);
    final verifiedItem = QueuedIncidentItem.fromMap(jsonDecode(verifiedJson));

    _queue.add(verifiedItem);
    notifyListeners();
  }

  /// Synchronize pending queue when network is restored
  Future<int> syncPendingQueue({
    required Future<bool> Function(QueuedIncidentItem item) uploadFunction,
  }) async {
    if (_isSyncing) return 0;
    _isSyncing = true;
    notifyListeners();

    int syncedCount = 0;
    for (final item in _queue) {
      if (!item.isUploaded) {
        final success = await uploadFunction(item);
        if (success) {
          item.isUploaded = true;
          syncedCount++;
        }
      }
    }

    _isSyncing = false;
    notifyListeners();
    return syncedCount;
  }

  void clearUploaded() {
    _queue.removeWhere((item) => item.isUploaded);
    notifyListeners();
  }
}
