import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../core/auth/auth_repository.dart';
import '../core/auth/user_profile.dart';
import '../features/auth/class_selection_screen.dart';
import '../features/auth/login_screen.dart';
import '../features/auth/role_selection_screen.dart';
import '../features/home/home_screen.dart';
import '../features/labs/labs_screen.dart';
import '../features/onboarding/onboarding_screen.dart';
import '../features/practical/lab_report_screen.dart';
import '../features/practical/practical_screen.dart';
import '../features/profile/achievements_screen.dart';
import '../features/profile/privacy_policy_screen.dart';
import '../features/profile/profile_screen.dart';
import '../features/profile/settings_screen.dart';
import '../features/shell/home_shell.dart';
import '../features/spark/ask_spark_screen.dart';

/// Whether the user has seen the onboarding carousel yet.
class OnboardingSeen extends Notifier<bool> {
  static const _key = 'onboarding_seen_v1';

  @override
  bool build() {
    // Best-effort read; hydration happens in main() before runApp() below.
    return _cached ?? false;
  }

  static bool? _cached;

  static Future<void> hydrate() async {
    final prefs = await SharedPreferences.getInstance();
    _cached = prefs.getBool(_key) ?? false;
  }

  Future<void> markSeen() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_key, true);
    _cached = true;
    state = true;
  }
}

final onboardingSeenProvider =
    NotifierProvider<OnboardingSeen, bool>(OnboardingSeen.new);

final routerProvider = Provider<GoRouter>((ref) {
  final refreshListenable = _RouterRefresh(ref);

  return GoRouter(
    initialLocation: '/onboarding',
    refreshListenable: refreshListenable,
    redirect: (context, state) {
      final onboardingSeen = ref.read(onboardingSeenProvider);
      final authState = ref.read(authStateProvider);
      final loc = state.matchedLocation;

      // Wait for auth state to hydrate before making decisions.
      if (authState.isLoading) return null;

      final signedIn = authState.value != null;
      final onboarding = loc == '/onboarding';
      final authFlow = loc.startsWith('/login') || loc == '/role';

      if (!onboardingSeen && !onboarding) return '/onboarding';
      if (onboardingSeen && onboarding) {
        return signedIn ? '/home' : '/login';
      }
      if (!signedIn && !onboarding && !loc.startsWith('/login')) {
        return '/login';
      }
      if (signedIn) {
        final profile = ref.read(userProfileProvider).value;
        // Force role picker first if the account has no role yet.
        if (profile != null && !profile.hasRole && loc != '/role') {
          return '/role';
        }
        // Then force class picker for students who haven't chosen a grade.
        if (profile != null && profile.needsGrade && loc != '/class') {
          return '/class';
        }
        // Signed-in users trying to hit login/onboarding go home.
        if (authFlow || onboarding) return '/home';
      }
      return null;
    },
    routes: [
      GoRoute(
        path: '/onboarding',
        builder: (_, __) => const OnboardingScreen(),
      ),
      GoRoute(
        path: '/login',
        builder: (_, __) => const LoginScreen(),
      ),
      GoRoute(
        path: '/role',
        builder: (_, __) => const RoleSelectionScreen(),
      ),
      GoRoute(
        path: '/class',
        builder: (_, __) => const ClassSelectionScreen(),
      ),
      ShellRoute(
        builder: (context, state, child) => HomeShell(child: child),
        routes: [
          GoRoute(
            path: '/home',
            pageBuilder: (_, __) => const NoTransitionPage(child: HomeScreen()),
          ),
          GoRoute(
            path: '/labs',
            pageBuilder: (_, __) => const NoTransitionPage(child: LabsScreen()),
          ),
          GoRoute(
            path: '/spark',
            pageBuilder: (_, __) =>
                const NoTransitionPage(child: AskSparkScreen()),
          ),
          GoRoute(
            path: '/practical',
            pageBuilder: (_, __) =>
                const NoTransitionPage(child: PracticalScreen()),
            routes: [
              // Sub-route so the bottom nav stays visible.
              GoRoute(
                path: 'report',
                builder: (context, state) {
                  final entry = state.extra as Map<String, dynamic>?;
                  return LabReportScreen(entry: entry ?? const {});
                },
              ),
            ],
          ),
          GoRoute(
            path: '/profile',
            pageBuilder: (_, __) =>
                const NoTransitionPage(child: ProfileScreen()),
            routes: [
              // Sub-routes stay inside the shell → bottom nav stays visible.
              GoRoute(
                path: 'settings',
                builder: (_, __) => const SettingsScreen(),
              ),
              GoRoute(
                path: 'achievements',
                builder: (_, __) => const AchievementsScreen(),
              ),
              GoRoute(
                path: 'privacy',
                builder: (_, __) => const PrivacyPolicyScreen(),
              ),
            ],
          ),
        ],
      ),
    ],
  );
});

/// Notifies GoRouter to re-evaluate `redirect()` whenever auth or the
/// onboarding flag changes.
class _RouterRefresh extends ChangeNotifier {
  _RouterRefresh(this._ref) {
    _ref.listen(authStateProvider, (_, __) => notifyListeners());
    _ref.listen(onboardingSeenProvider, (_, __) => notifyListeners());
    _ref.listen(userProfileProvider, (_, __) => notifyListeners());
  }
  final Ref _ref;
}
