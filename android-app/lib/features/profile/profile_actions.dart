import 'dart:math';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Firestore-backed actions for the profile screen (join class, invite parent).
///
/// Schema matches the web app so students who signed up on web see their
/// state on mobile:
///   users/{uid}
///     - classCode: string           ← student is enrolled in a class
///     - familyCode: string          ← used by parent to link
///     - joinedClassAt: Timestamp
///
///   classes/{classCode}
///     - teacherUid: string
///     - students: [uid, uid, ...]
class ProfileActions {
  ProfileActions(this._db, this._auth);
  final FirebaseFirestore _db;
  final FirebaseAuth _auth;

  User get _requireUser {
    final u = _auth.currentUser;
    if (u == null) throw ProfileException('Please sign in first.');
    return u;
  }

  /// Attempts to join the class with the given code. Throws a
  /// [ProfileException] with a human-readable message if the code doesn't
  /// exist or the student is already in a class.
  Future<void> joinClass(String rawCode) async {
    final code = rawCode.trim().toUpperCase();
    if (code.length < 4) {
      throw ProfileException('Class code must be at least 4 characters.');
    }
    final user = _requireUser;
    final classRef = _db.collection('classes').doc(code);
    final snap = await classRef.get();
    if (!snap.exists) {
      throw ProfileException(
        'No class found for code "$code". Double-check with your teacher.',
      );
    }
    await _db.collection('users').doc(user.uid).set({
      'classCode': code,
      'joinedClassAt': FieldValue.serverTimestamp(),
      'updatedAt': FieldValue.serverTimestamp(),
    }, SetOptions(merge: true));
    // Add self to the class's student list (idempotent).
    await classRef.set({
      'students': FieldValue.arrayUnion([user.uid]),
    }, SetOptions(merge: true));
  }

  /// Returns the current family code (creating one if the student doesn't
  /// yet have one). Parents use this to link to the child on their own app.
  Future<String> ensureFamilyCode() async {
    final user = _requireUser;
    final ref = _db.collection('users').doc(user.uid);
    final snap = await ref.get();
    final existing = snap.data()?['familyCode'] as String?;
    if (existing != null && existing.isNotEmpty) return existing;
    final code = _newCode(6);
    await ref.set({
      'familyCode': code,
      'updatedAt': FieldValue.serverTimestamp(),
    }, SetOptions(merge: true));
    return code;
  }

  /// Random 6-char human-readable code (no confusable 0/O, 1/I).
  static String _newCode(int len) {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    final rand = Random.secure();
    return List.generate(len, (_) => alphabet[rand.nextInt(alphabet.length)])
        .join();
  }
}

class ProfileException implements Exception {
  ProfileException(this.message);
  final String message;
  @override
  String toString() => message;
}

final profileActionsProvider = Provider<ProfileActions>((ref) {
  return ProfileActions(FirebaseFirestore.instance, FirebaseAuth.instance);
});
