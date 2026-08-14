import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/auth/user_profile.dart';
import 'labs_catalog.dart';
import 'models/lab.dart';

/// Facade over the compile-time lab catalog + Firestore student progress.
///
/// The 40 lab specs are static (defined in [kLabCatalog]) — the catalog
/// itself doesn't change during a session. Per-student completion state
/// lives at `users/{uid}` on Firestore, matching the existing web schema
/// so the mobile app inherits student progress created on the web.
class LabsRepository {
  LabsRepository(this._db, this._auth);

  final FirebaseFirestore _db;
  final FirebaseAuth _auth;

  List<Lab> allLabs() => kLabCatalog;

  Lab? findById(String id) {
    for (final l in kLabCatalog) {
      if (l.id == id) return l;
    }
    return null;
  }

  /// Stream of completion ids from `users/{uid}.completions[]`. Empty when
  /// signed out.
  Stream<Set<String>> completionsStream() {
    final uid = _auth.currentUser?.uid;
    if (uid == null) return Stream.value(const {});
    return _db.collection('users').doc(uid).snapshots().map((doc) {
      final raw = doc.data()?['completions'] as List<dynamic>? ?? const [];
      return raw
          .map((entry) => entry is Map<String, dynamic> ? entry['id'] as String? : null)
          .whereType<String>()
          .toSet();
    });
  }
}

final labsRepositoryProvider = Provider<LabsRepository>((ref) {
  return LabsRepository(FirebaseFirestore.instance, FirebaseAuth.instance);
});

/// Live set of completed lab ids for the signed-in student.
final completionsProvider = StreamProvider<Set<String>>((ref) {
  return ref.watch(labsRepositoryProvider).completionsStream();
});

/// Filter state used by the catalog screen. Kept in a Notifier so the FAB
/// / search field can reset all filters at once without dozens of setters.
class LabFilter {
  const LabFilter({this.grade, this.subject, this.query = ''});
  final int? grade;
  final LabSubject? subject;
  final String query;

  LabFilter copyWith({int? grade, LabSubject? subject, String? query, bool clearGrade = false, bool clearSubject = false}) {
    return LabFilter(
      grade: clearGrade ? null : grade ?? this.grade,
      subject: clearSubject ? null : subject ?? this.subject,
      query: query ?? this.query,
    );
  }
}

class LabFilterNotifier extends Notifier<LabFilter> {
  @override
  LabFilter build() => const LabFilter();
  void setGrade(int? g) => state = state.copyWith(grade: g, clearGrade: g == null);
  void setSubject(LabSubject? s) => state = state.copyWith(subject: s, clearSubject: s == null);
  void setQuery(String q) => state = state.copyWith(query: q);
  void clear() => state = const LabFilter();
}

final labFilterProvider =
    NotifierProvider<LabFilterNotifier, LabFilter>(LabFilterNotifier.new);

/// Labs the signed-in student is *allowed* to see. Locked to their chosen
/// class (grade) — a Class 8 student never sees Class 6/7/9/10 labs.
/// Teachers and non-student roles see everything.
final allowedLabsProvider = Provider<List<Lab>>((ref) {
  final profile = ref.watch(userProfileProvider).valueOrNull;
  final all = ref.watch(labsRepositoryProvider).allLabs();
  if (profile == null) return all;
  final isStudent = profile.role == 'student';
  final grade = profile.grade;
  if (!isStudent || grade == null) return all;
  return all.where((l) => l.grade == grade).toList();
});

/// Filtered lab list — starts from [allowedLabsProvider] so the class lock
/// is respected, then applies the user's search + subject chip.
final filteredLabsProvider = Provider<List<Lab>>((ref) {
  final filter = ref.watch(labFilterProvider);
  final allowed = ref.watch(allowedLabsProvider);
  final q = filter.query.trim().toLowerCase();
  return allowed.where((lab) {
    // grade chip only matters if student sees more than one class
    if (filter.grade != null && lab.grade != filter.grade) return false;
    if (filter.subject != null && lab.subject != filter.subject) return false;
    if (q.isNotEmpty) {
      final hay = '${lab.title} ${lab.chapter}'.toLowerCase();
      if (!hay.contains(q)) return false;
    }
    return true;
  }).toList();
});

/// The lab a student should "continue" — first uncompleted lab from the
/// class-locked list. Falls back to the first allowed lab.
final continueLabProvider = Provider<Lab>((ref) {
  final done = ref.watch(completionsProvider).valueOrNull ?? const <String>{};
  final allowed = ref.watch(allowedLabsProvider);
  final pool = allowed.isEmpty ? kLabCatalog : allowed;
  for (final lab in pool) {
    if (!done.contains(lab.id)) return lab;
  }
  return pool.first;
});
