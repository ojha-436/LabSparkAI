import 'package:flutter/material.dart';

import '../../core/theme/app_tokens.dart';

class PrivacyPolicyScreen extends StatelessWidget {
  const PrivacyPolicyScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Scaffold(
      appBar: AppBar(title: const Text('Privacy policy')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 40),
        children: [
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: LabSparkTokens.teal600.withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: LabSparkTokens.teal600.withValues(alpha: 0.24),
              ),
            ),
            child: Row(
              children: [
                const Icon(Icons.shield_moon_rounded,
                    color: LabSparkTokens.teal600, size: 24),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Effective 13 August 2026',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 1.2,
                            color: scheme.onSurfaceVariant,
                          )),
                      const SizedBox(height: 2),
                      const Text(
                        'LabSpark AI takes your privacy seriously — especially since our users are students.',
                        style: TextStyle(
                          fontSize: 13, fontWeight: FontWeight.w600, height: 1.4,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const _Section(
            title: '1. Who we are',
            body:
                'LabSpark AI ("we", "us") is an educational technology product '
                'that offers an AI-powered virtual science laboratory for CBSE '
                'Class 6–10 Physics & Chemistry students. This policy describes '
                'what personal information the app collects, how it is used, '
                'and the choices you have.',
          ),
          _Section(
            title: '2. Information we collect',
            body: '',
            child: _BulletList(items: [
              _Bullet(
                bold: 'Account information',
                text:
                    'name, email, profile photo — when you sign in with Google or create an email account.',
              ),
              _Bullet(
                bold: 'Learning progress',
                text:
                    'labs you complete, quiz answers, XP, streak, badges. Stored in Firebase Firestore under your unique user id.',
              ),
              _Bullet(
                bold: 'Voice input',
                text:
                    'when you tap the microphone in "Ask Spark", audio is captured only during your speech. It\'s transcribed on-device using the Android SpeechRecognizer — the raw audio never leaves your phone.',
              ),
              _Bullet(
                bold: 'AI conversations',
                text:
                    'text of your questions and Spark\'s replies. Stored locally on your phone for chat history, and sent to our secure Google Cloud Run backend for Gemini to answer.',
              ),
              _Bullet(
                bold: 'Class & family codes',
                text:
                    'if you join a class or invite a parent, the codes are stored in Firestore so the right people can see your progress.',
              ),
              _Bullet(
                bold: 'Diagnostic data',
                text:
                    'crash reports and anonymous usage statistics to help us find and fix bugs.',
              ),
            ]),
          ),
          const _Section(
            title: '3. What we do NOT collect',
            body: '',
            child: _BulletList(items: [
              _Bullet(bold: '', text: 'Government IDs of any kind (Aadhaar, PAN, etc.)'),
              _Bullet(bold: '', text: 'Financial or payment information'),
              _Bullet(bold: '', text: 'Location data or GPS coordinates'),
              _Bullet(bold: '', text: 'Contact list, photos, or files outside the app'),
              _Bullet(bold: '', text: 'Background microphone or camera recording'),
              _Bullet(bold: '', text: 'Biometric data (fingerprint, face)'),
            ]),
          ),
          const _Section(
            title: '4. How we use your information',
            body:
                'We use the data listed above only to make the LabSpark AI '
                'experience work: to personalise your dashboard, save your '
                'lab progress, generate your CBSE practical file, answer your '
                'questions with Gemini, and share progress with the teacher '
                'or parent you have linked. We do not sell or rent your data '
                'to any third party, ever.',
          ),
          const _Section(
            title: '5. Who your data is shared with',
            body: '',
            child: _BulletList(items: [
              _Bullet(
                bold: 'Google Firebase (Auth + Firestore)',
                text: 'stores your account and progress.',
              ),
              _Bullet(
                bold: 'Google Cloud (Vertex AI / Gemini API)',
                text:
                    'processes your questions so Spark can answer. No question is used to train other AI models.',
              ),
              _Bullet(
                bold: 'Your teacher',
                text:
                    'if you join a class, they can see your completed labs and scores.',
              ),
              _Bullet(
                bold: 'Your parent',
                text:
                    'if you share your family code, they can see the same progress.',
              ),
            ]),
          ),
          const _Section(
            title: '6. Students under 13',
            body:
                'If you are under 13, we require a parent or guardian to '
                'set up your account and share the family code. We do not '
                'target ads at children, and we don\'t use your data for '
                'advertising of any kind.',
          ),
          const _Section(
            title: '7. Your rights',
            body:
                'You can:',
            child: _BulletList(items: [
              _Bullet(bold: 'See ', text: 'all data we hold about you inside the app (Profile → Achievements, Practical File).'),
              _Bullet(bold: 'Delete ', text: 'your account and all associated data by writing to us at the address below.'),
              _Bullet(bold: 'Export ', text: 'your practical file at any time from the Practical File tab.'),
              _Bullet(bold: 'Withdraw consent ', text: 'for microphone or voice features from Android Settings → Apps → LabSpark AI → Permissions.'),
            ]),
          ),
          const _Section(
            title: '8. Data retention',
            body:
                'We keep your account and progress data for as long as you '
                'use LabSpark AI. If you delete your account we remove your '
                'personal information from active systems within 30 days. '
                'Backups are purged within 90 days.',
          ),
          const _Section(
            title: '9. Security',
            body:
                'All communication between the app and our servers is '
                'encrypted with HTTPS (TLS 1.2+). Your Gemini API access is '
                'protected server-side — your Firebase ID token authenticates '
                'every request. Firestore security rules ensure you can only '
                'read and write your own data.',
          ),
          const _Section(
            title: '10. Changes to this policy',
            body:
                'If we make any material change to this policy, we will '
                'notify you in the app before the change takes effect. The '
                '"Effective" date at the top of this page always reflects '
                'the current version.',
          ),
          const _Section(
            title: '11. Contact us',
            body:
                'For any question about this policy, or to exercise any of '
                'your rights above, write to us at:\n\n'
                'privacy@labspark.ai\nLabSpark AI · Data Protection Officer',
          ),
          const SizedBox(height: 12),
          Center(
            child: Text(
              'By using LabSpark AI, you agree to this privacy policy.',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: scheme.onSurfaceVariant,
                fontSize: 12.5,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _Section extends StatelessWidget {
  const _Section({required this.title, required this.body, this.child});
  final String title;
  final String body;
  final Widget? child;
  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.only(top: 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title,
              style: const TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w800,
              )),
          const SizedBox(height: 8),
          if (body.isNotEmpty)
            Text(body,
                style: TextStyle(
                  fontSize: 13.5,
                  height: 1.55,
                  color: scheme.onSurface.withValues(alpha: 0.85),
                )),
          if (child != null) ...[
            if (body.isNotEmpty) const SizedBox(height: 8),
            child!,
          ],
        ],
      ),
    );
  }
}

class _Bullet {
  const _Bullet({required this.bold, required this.text});
  final String bold;
  final String text;
}

class _BulletList extends StatelessWidget {
  const _BulletList({required this.items});
  final List<_Bullet> items;
  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        for (final b in items)
          Padding(
            padding: const EdgeInsets.only(top: 6),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Padding(
                  padding: const EdgeInsets.only(top: 8, right: 10),
                  child: Container(
                    width: 5, height: 5,
                    decoration: const BoxDecoration(
                      color: LabSparkTokens.teal600,
                      shape: BoxShape.circle,
                    ),
                  ),
                ),
                Expanded(
                  child: RichText(
                    text: TextSpan(
                      style: TextStyle(
                        fontSize: 13.5,
                        height: 1.55,
                        color: scheme.onSurface.withValues(alpha: 0.85),
                      ),
                      children: [
                        if (b.bold.isNotEmpty)
                          TextSpan(
                            text: '${b.bold}: ',
                            style: const TextStyle(fontWeight: FontWeight.w800),
                          ),
                        TextSpan(text: b.text),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
      ],
    );
  }
}
