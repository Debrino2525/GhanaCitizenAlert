import 'package:flutter_test/flutter_test.dart';
import '../lib/core/security/crypto_manager.dart';
import '../lib/core/localization/app_localizations.dart';
import '../lib/features/capture/camera_capture_controller.dart';
import '../lib/features/offline_queue/offline_queue_service.dart';
import '../lib/features/sos_panic/sos_panic_service.dart';

void main() {
  group('CryptoManager & Local Storage Tests', () {
    test('should encrypt and decrypt local string data using AES-256-GCM', () {
      const sensitiveData = '{"reporter": "Kwame Mensah", "ghanaCard": "GHA-712893812-4"}';
      final encrypted = CryptoManager.encryptLocalData(sensitiveData);

      expect(encrypted, isNot(contains('Kwame Mensah')));
      expect(encrypted.split(':').length, equals(2));

      final decrypted = CryptoManager.decryptLocalData(encrypted);
      expect(decrypted, equals(sensitiveData));
    });

    test('should compute deterministic SHA-256 string hash', () {
      final hash1 = CryptoManager.hashString('test_evidence_1');
      final hash2 = CryptoManager.hashString('test_evidence_1');
      final hash3 = CryptoManager.hashString('test_evidence_2');

      expect(hash1, equals(hash2));
      expect(hash1.length, equals(64));
      expect(hash1, isNot(equals(hash3)));
    });
  });

  group('CameraCaptureController 60-Second Hard Limit', () {
    test('should stop recording and finalize evidence with watermark and SHA-256', () async {
      final controller = CameraCaptureController();
      bool maxReachedCalled = false;

      controller.startRecording(onMaxDurationReached: () {
        maxReachedCalled = true;
      });

      expect(controller.isRecording, isTrue);

      final evidence = await controller.stopRecording(
        mockFilePath: '/data/user/0/ghana.safety/evidence.mp4',
        lat: 5.6354,
        lng: -0.1582,
        ghanaPostCode: 'GA-382-9104',
      );

      expect(controller.isRecording, isFalse);
      expect(evidence.durationSeconds, lessThanOrEqualTo(60));
      expect(evidence.sha256Checksum.length, equals(64));
      expect(evidence.ghanaPostCode, equals('GA-382-9104'));
      expect(evidence.isWatermarkVerified, isTrue);
    });
  });

  group('OfflineQueueService', () {
    test('should enqueue encrypted items and track pending count', () async {
      final queueService = OfflineQueueService();
      expect(queueService.pendingCount, equals(0));

      final evidence = CapturedEvidence(
        filePath: '/tmp/test.mp4',
        mediaType: 'VIDEO',
        durationSeconds: 30,
        sha256Checksum: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        timestampUtc: DateTime.now().toUtc().toIso8601String(),
        latitude: 5.6037,
        longitude: -0.1870,
        ghanaPostCode: 'GA-183-9022',
      );

      await queueService.enqueueIncident(
        category: 'CRIMINAL_OFFENSE',
        title: 'Armed Break-in Attempt',
        description: 'Test incident description',
        ghanaPostCode: 'GA-183-9022',
        isAnonymous: false,
        evidence: evidence,
      );

      expect(queueService.pendingCount, equals(1));

      // Test batch synchronization
      final synced = await queueService.syncPendingQueue(
        uploadFunction: (item) async => true,
      );

      expect(synced, equals(1));
      expect(queueService.pendingCount, equals(0));
    });
  });

  group('SOSPanicService', () {
    test('should activate SOS beacon and start live coordinates tracking', () async {
      final sosService = SOSPanicService();
      expect(sosService.state.isActive, isFalse);

      final beacon = await sosService.triggerSOS(
        lat: 5.6811,
        lng: -0.1652,
        ghanaPost: 'GM-014-9923',
      );

      expect(beacon.isActive, isTrue);
      expect(beacon.beaconId, startsWith('SOS-GH-'));
      expect(beacon.ghanaPostCode, equals('GM-014-9923'));

      sosService.cancelSOS();
      expect(sosService.state.isActive, isFalse);
    });
  });

  group('AppLocalizations Multi-Language Dictionary', () {
    test('should return correct translations for English, Twi, Ga, Ewe, and Hausa', () {
      final en = AppLocalizations('en');
      final tw = AppLocalizations('tw');
      final ga = AppLocalizations('ga');
      final ee = AppLocalizations('ee');
      final ha = AppLocalizations('ha');

      expect(en.get('sos_panic'), equals('EMERGENCY SOS'));
      expect(tw.get('sos_panic'), equals('MBOA NTƐM (SOS)'));
      expect(ga.get('sos_panic'), equals('YELIKƐBUAMƆ (SOS)'));
      expect(ee.get('sos_panic'), equals('KPƆXƆXƆ KABA (SOS)'));
      expect(ha.get('sos_panic'), equals('TAIMAKON GAUGĀWA (SOS)'));
    });
  });
}
