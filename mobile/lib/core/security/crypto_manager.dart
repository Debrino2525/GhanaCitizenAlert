import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';
import 'package:crypto/crypto.dart';
import 'package:encrypt/encrypt.dart' as enc;

class CryptoManager {
  static const String _defaultStorageKey = 'CITIZEN_ALERT_GHANA_SECURE_ENCLAVE_2026';

  /// Compute SHA-256 checksum over a file
  static Future<String> computeFileSha256(File file) async {
    final bytes = await file.readAsBytes();
    final digest = sha256.convert(bytes);
    return digest.toString();
  }

  /// Compute SHA-256 string hash
  static String hashString(String input) {
    return sha256.convert(utf8.encode(input)).toString();
  }

  /// Encrypt string payload for offline local SQLite storage using AES-256-GCM
  static String encryptLocalData(String plainText, {String? keyStr}) {
    final key = enc.Key.fromUtf8((keyStr ?? _defaultStorageKey).padRight(32, '0').substring(0, 32));
    final iv = enc.IV.fromSecureRandom(12);
    final encrypter = enc.Encrypter(enc.AES(key, mode: enc.AESMode.gcm));

    final encrypted = encrypter.encrypt(plainText, iv: iv);
    return '${iv.base64}:${encrypted.base64}';
  }

  /// Decrypt string payload from offline storage
  static String decryptLocalData(String encryptedPayload, {String? keyStr}) {
    final parts = encryptedPayload.split(':');
    if (parts.length != 2) throw Exception('Invalid encrypted format');

    final key = enc.Key.fromUtf8((keyStr ?? _defaultStorageKey).padRight(32, '0').substring(0, 32));
    final iv = enc.IV.fromBase64(parts[0]);
    final encrypter = enc.Encrypter(enc.AES(key, mode: enc.AESMode.gcm));

    return encrypter.decrypt(enc.Encrypted.fromBase64(parts[1]), iv: iv);
  }
}
