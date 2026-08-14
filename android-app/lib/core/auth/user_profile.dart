// Reads the Firestore /users/{uid} doc as a stream so the UI knows the user's
// role, XP, streak and completions.
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'auth_repository.dart';

class UserProfile {
  const UserProfile({
    required this.uid,
    required this.displayName,
    required this.email,
    required this.role,
    required this.grade,
    required this.xp,
    required this.streak,
    this.photoURL,
  });

  final String uid;
  final String displayName;
  final String? email;
  final String? photoURL;
  final String? role; // 'student' | 'teacher' | 'parent' | null
  final int? grade;   // 6..10 for students, null for others
  final int xp;
  final int streak;

  bool get hasRole => role != null && role!.isNotEmpty;

  /// A student is considered "onboarded" only once they've picked a class.
  bool get needsGrade => role == 'student' && grade == null;

  factory UserProfile.fromFirestore(DocumentSnapshot<Map<String, dynamic>> snap,
      {required User fallback}) {
    final data = snap.data() ?? const <String, dynamic>{};
    return UserProfile(
      uid: fallback.uid,
      displayName:
          (data['displayName'] as String?) ?? fallback.displayName ?? '',
      email: (data['email'] as String?) ?? fallback.email,
      photoURL: (data['photoURL'] as String?) ?? fallback.photoURL,
      role: data['role'] as String?,
      grade: (data['grade'] as num?)?.toInt(),
      xp: (data['xp'] as num?)?.toInt() ?? 0,
      streak: (data['streak'] as num?)?.toInt() ?? 0,
    );
  }
}

final userProfileProvider = StreamProvider<UserProfile?>((ref) {
  final auth = ref.watch(authStateProvider).value;
  if (auth == null) return Stream.value(null);
  return FirebaseFirestore.instance
      .collection('users')
      .doc(auth.uid)
      .snapshots()
      .map((snap) => UserProfile.fromFirestore(snap, fallback: auth));
});
