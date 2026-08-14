// Thin wrapper around FirebaseAuth + GoogleSignIn that the UI layer talks to.
// Keeps SDK types out of the widgets so tests can mock this easily.
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_sign_in/google_sign_in.dart';

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepository(
    auth: FirebaseAuth.instance,
    firestore: FirebaseFirestore.instance,
    google: GoogleSignIn(),
  );
});

final authStateProvider = StreamProvider<User?>((ref) {
  return ref.watch(authRepositoryProvider).authStateChanges();
});

class AuthRepository {
  AuthRepository({
    required FirebaseAuth auth,
    required FirebaseFirestore firestore,
    required GoogleSignIn google,
  })  : _auth = auth,
        _firestore = firestore,
        _google = google;

  final FirebaseAuth _auth;
  final FirebaseFirestore _firestore;
  final GoogleSignIn _google;

  Stream<User?> authStateChanges() => _auth.authStateChanges();

  User? get currentUser => _auth.currentUser;

  Future<User> signInWithGoogle() async {
    try {
      final account = await _google.signIn();
      if (account == null) {
        throw AuthException('Sign-in was cancelled.');
      }
      final googleAuth = await account.authentication;
      if (googleAuth.idToken == null) {
        throw AuthException(
          'Google sign-in returned no ID token. Re-download google-services.json '
          'from Firebase Console after enabling Google as a provider, then rebuild.',
        );
      }
      final credential = GoogleAuthProvider.credential(
        accessToken: googleAuth.accessToken,
        idToken: googleAuth.idToken,
      );
      final result = await _auth.signInWithCredential(credential);
      final user = result.user;
      if (user == null) {
        throw AuthException('Sign-in returned no user.');
      }
      await _ensureUserDocument(user);
      return user;
    } on PlatformException catch (e) {
      if (kDebugMode) debugPrint('GoogleSignIn PlatformException: ${e.code} ${e.message}');
      throw AuthException(_readableGoogleError(e));
    } on FirebaseAuthException catch (e) {
      if (kDebugMode) debugPrint('FirebaseAuth error on Google sign-in: ${e.code} ${e.message}');
      throw AuthException(_readableAuthError(e));
    } on AuthException {
      rethrow;
    } catch (e) {
      if (kDebugMode) debugPrint('Unknown sign-in error: $e');
      throw AuthException('Sign-in failed. Check your internet connection.');
    }
  }

  String _readableGoogleError(PlatformException e) {
    switch (e.code) {
      case 'sign_in_failed':
        // ApiException 10 = DEVELOPER_ERROR: SHA-1 or package name mismatch.
        if (e.message?.contains('10:') ?? false) {
          return 'Google Sign-In not configured. In Firebase Console → '
              'Project settings → Your apps → Android, add your debug SHA-1 '
              'fingerprint and re-download google-services.json.';
        }
        return 'Google Sign-In failed. ${e.message ?? ''}';
      case 'network_error':
        return 'Network error — check your internet connection.';
      case 'sign_in_canceled':
        return 'Sign-in was cancelled.';
      default:
        return e.message ?? 'Google Sign-In error (${e.code}).';
    }
  }

  Future<User> signInWithEmail(String email, String password) async {
    try {
      final result = await _auth.signInWithEmailAndPassword(
        email: email,
        password: password,
      );
      final user = result.user!;
      await _ensureUserDocument(user);
      return user;
    } on FirebaseAuthException catch (e) {
      throw AuthException(_readableAuthError(e));
    }
  }

  Future<User> signUpWithEmail({
    required String email,
    required String password,
    required String displayName,
  }) async {
    try {
      final result = await _auth.createUserWithEmailAndPassword(
        email: email,
        password: password,
      );
      final user = result.user!;
      await user.updateDisplayName(displayName);
      await _ensureUserDocument(user, displayName: displayName);
      return user;
    } on FirebaseAuthException catch (e) {
      throw AuthException(_readableAuthError(e));
    }
  }

  Future<void> signOut() async {
    await _google.signOut();
    await _auth.signOut();
  }

  Future<void> _ensureUserDocument(User user, {String? displayName}) async {
    final doc = _firestore.collection('users').doc(user.uid);
    final snap = await doc.get();
    if (snap.exists) return;
    await doc.set({
      'uid': user.uid,
      'email': user.email,
      'displayName': displayName ?? user.displayName ?? '',
      'photoURL': user.photoURL,
      'role': null, // populated on RoleSelectionScreen
      'xp': 0,
      'streak': 0,
      'completions': <Map<String, dynamic>>[],
      'createdAt': FieldValue.serverTimestamp(),
      'updatedAt': FieldValue.serverTimestamp(),
    });
  }

  Future<void> setRole(String role) async {
    final user = _auth.currentUser;
    if (user == null) return;
    await _firestore.collection('users').doc(user.uid).set({
      'role': role,
      'updatedAt': FieldValue.serverTimestamp(),
    }, SetOptions(merge: true));
  }

  /// The student's chosen class (6..10). Locks which labs they can see.
  Future<void> setGrade(int grade) async {
    final user = _auth.currentUser;
    if (user == null) return;
    await _firestore.collection('users').doc(user.uid).set({
      'grade': grade,
      'updatedAt': FieldValue.serverTimestamp(),
    }, SetOptions(merge: true));
  }

  String _readableAuthError(FirebaseAuthException e) {
    switch (e.code) {
      case 'invalid-email':
        return 'That email address is not valid.';
      case 'user-not-found':
      case 'wrong-password':
      case 'invalid-credential':
        return 'Email or password is incorrect.';
      case 'email-already-in-use':
        return 'An account already exists for that email.';
      case 'weak-password':
        return 'Password should be at least 6 characters.';
      case 'network-request-failed':
        return 'No internet connection.';
      default:
        return e.message ?? 'Authentication failed. Please try again.';
    }
  }
}

class AuthException implements Exception {
  AuthException(this.message);
  final String message;
  @override
  String toString() => message;
}
