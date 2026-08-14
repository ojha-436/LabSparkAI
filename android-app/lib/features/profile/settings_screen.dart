import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../core/theme/app_tokens.dart';

/// User preferences. Stored in SharedPreferences for now — sync to Firestore
/// in a later phase.
final themeModeProvider =
    NotifierProvider<ThemeModeNotifier, ThemeMode>(ThemeModeNotifier.new);

class ThemeModeNotifier extends Notifier<ThemeMode> {
  static const _key = 'themeMode';
  @override
  ThemeMode build() {
    _load();
    return ThemeMode.system;
  }
  Future<void> _load() async {
    final p = await SharedPreferences.getInstance();
    final raw = p.getString(_key);
    if (raw == null) return;
    state = ThemeMode.values.firstWhere(
      (m) => m.name == raw,
      orElse: () => ThemeMode.system,
    );
  }
  Future<void> set(ThemeMode m) async {
    state = m;
    final p = await SharedPreferences.getInstance();
    await p.setString(_key, m.name);
  }
}

final narrationEnabledProvider =
    NotifierProvider<_BoolPrefNotifier, bool>(() => _BoolPrefNotifier('narration', true));
final hapticsEnabledProvider =
    NotifierProvider<_BoolPrefNotifier, bool>(() => _BoolPrefNotifier('haptics', true));

class _BoolPrefNotifier extends Notifier<bool> {
  _BoolPrefNotifier(this._key, this._defaultValue);
  final String _key;
  final bool _defaultValue;
  @override
  bool build() {
    _load();
    return _defaultValue;
  }
  Future<void> _load() async {
    final p = await SharedPreferences.getInstance();
    state = p.getBool(_key) ?? _defaultValue;
  }
  Future<void> set(bool v) async {
    state = v;
    final p = await SharedPreferences.getInstance();
    await p.setBool(_key, v);
  }
}

class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final themeMode = ref.watch(themeModeProvider);
    final narration = ref.watch(narrationEnabledProvider);
    final haptics = ref.watch(hapticsEnabledProvider);
    final scheme = Theme.of(context).colorScheme;
    return Scaffold(
      appBar: AppBar(title: const Text('Settings')),
      body: ListView(
        padding: const EdgeInsets.symmetric(vertical: 8),
        children: [
          _SectionHeader('APPEARANCE'),
          _RadioRow(
            title: 'System default',
            subtitle: 'Match your phone\'s dark/light mode',
            value: ThemeMode.system,
            group: themeMode,
            onChanged: (m) => ref.read(themeModeProvider.notifier).set(m),
          ),
          _RadioRow(
            title: 'Always light',
            subtitle: 'Cream backgrounds, teal accents',
            value: ThemeMode.light,
            group: themeMode,
            onChanged: (m) => ref.read(themeModeProvider.notifier).set(m),
          ),
          _RadioRow(
            title: 'Always dark',
            subtitle: 'Easier on the eyes at night',
            value: ThemeMode.dark,
            group: themeMode,
            onChanged: (m) => ref.read(themeModeProvider.notifier).set(m),
          ),
          _SectionHeader('EXPERIENCE'),
          SwitchListTile(
            title: const Text('Voice narration'),
            subtitle: const Text('Spark narrates each step aloud in labs'),
            value: narration,
            onChanged: (v) => ref.read(narrationEnabledProvider.notifier).set(v),
            activeThumbColor: LabSparkTokens.teal600,
          ),
          SwitchListTile(
            title: const Text('Haptic feedback'),
            subtitle: const Text('Vibrations on taps and reactions'),
            value: haptics,
            onChanged: (v) => ref.read(hapticsEnabledProvider.notifier).set(v),
            activeThumbColor: LabSparkTokens.teal600,
          ),
          _SectionHeader('ACCOUNT'),
          ListTile(
            leading: const Icon(Icons.mail_outline_rounded),
            title: const Text('Help & feedback'),
            subtitle: const Text('feedback@labspark.ai'),
            onTap: () {
              ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
                content: Text('Email feedback@labspark.ai'),
                behavior: SnackBarBehavior.floating,
              ));
            },
          ),
          ListTile(
            leading: const Icon(Icons.privacy_tip_outlined),
            title: const Text('Privacy policy'),
            subtitle: const Text('How we handle your data'),
            trailing: const Icon(Icons.chevron_right_rounded),
            onTap: () => context.push('/profile/privacy'),
          ),
          const SizedBox(height: 8),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
            child: Text(
              'LabSpark AI · v0.1.0',
              style: TextStyle(color: scheme.onSurfaceVariant, fontSize: 12),
              textAlign: TextAlign.center,
            ),
          ),
        ],
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader(this.text);
  final String text;
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 24, 20, 8),
      child: Text(
        text,
        style: TextStyle(
          color: Theme.of(context).colorScheme.onSurfaceVariant,
          fontWeight: FontWeight.w800,
          letterSpacing: 1.4,
          fontSize: 11,
        ),
      ),
    );
  }
}

class _RadioRow extends StatelessWidget {
  const _RadioRow({
    required this.title,
    required this.subtitle,
    required this.value,
    required this.group,
    required this.onChanged,
  });
  final String title;
  final String subtitle;
  final ThemeMode value;
  final ThemeMode group;
  final ValueChanged<ThemeMode> onChanged;
  @override
  Widget build(BuildContext context) {
    final selected = value == group;
    return ListTile(
      title: Text(title),
      subtitle: Text(subtitle),
      trailing: Icon(
        selected
            ? Icons.radio_button_checked
            : Icons.radio_button_unchecked,
        color: selected ? LabSparkTokens.teal600 : null,
      ),
      onTap: () => onChanged(value),
    );
  }
}
