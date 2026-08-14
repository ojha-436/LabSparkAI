import 'dart:async';
import 'dart:convert';

import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:http/http.dart' as http;

/// The deployed Cloud Run URL for the LabSpark backend.
///
/// The web app uses `VITE_API_BASE` env var; here we bake the production URL
/// as a compile-time default. Override at run time with
/// `flutter run --dart-define=LABSPARK_API_BASE=https://your-url`.
const kApiBase = String.fromEnvironment(
  'LABSPARK_API_BASE',
  defaultValue: 'https://labspark-backend-6qifere4fa-el.a.run.app',
);

/// Thin HTTP client for the Cloud Run backend. Attaches the Firebase ID
/// token as `Authorization: Bearer …` (backend expects this).
class ApiClient {
  ApiClient(this._auth);

  final FirebaseAuth _auth;

  Uri _url(String path) => Uri.parse('$kApiBase$path');

  Future<Map<String, String>> _headers() async {
    final headers = <String, String>{'Content-Type': 'application/json'};
    final user = _auth.currentUser;
    if (user != null) {
      try {
        final token = await user.getIdToken();
        if (token != null) headers['Authorization'] = 'Bearer $token';
      } catch (_) {
        // No token → backend returns 401 → caller falls back locally.
      }
    }
    return headers;
  }

  Future<Map<String, dynamic>> postJson(
    String path,
    Map<String, dynamic> body, {
    Duration timeout = const Duration(seconds: 12),
  }) async {
    final headers = await _headers();
    final res = await http
        .post(_url(path), headers: headers, body: jsonEncode(body))
        .timeout(timeout);
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw ApiException('Backend ${res.statusCode}', res.statusCode);
    }
    return jsonDecode(res.body) as Map<String, dynamic>;
  }
}

class ApiException implements Exception {
  ApiException(this.message, [this.statusCode]);
  final String message;
  final int? statusCode;
  @override
  String toString() => 'ApiException($statusCode): $message';
}

final apiClientProvider = Provider<ApiClient>((ref) {
  return ApiClient(FirebaseAuth.instance);
});
