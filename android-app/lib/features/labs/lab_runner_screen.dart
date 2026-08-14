import 'dart:async';
import 'dart:convert';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_inappwebview/flutter_inappwebview.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/lab_host.dart';
import '../../core/theme/app_tokens.dart';
import '../../core/theme/logo.dart';
import '../../data/models/lab.dart';
import '../spark/spark_conversation.dart';
import '../spark/spark_repository.dart';
import '../spark/spark_tts_service.dart';
import 'lab_complete_screen.dart';
import 'spark_lab_sheet.dart';

/// Full-screen WebView that hosts the R3F 3D lab scenes served from
/// Firebase Hosting.
///
/// Mobile UX principles applied:
///   • WebView fills the entire viewport by default — the lab is the star.
///   • Ultra-compact top bar (48 dp): exit · title · Live pill.
///   • Fullscreen toggle in the top-right corner hides the bar entirely.
///   • Ask Spark is a floating action button that expands into a bottom
///     sheet — never blocking the workbench.
class LabRunnerScreen extends ConsumerStatefulWidget {
  const LabRunnerScreen({super.key, required this.lab});
  final Lab lab;

  @override
  ConsumerState<LabRunnerScreen> createState() => _LabRunnerScreenState();
}

class _LabRunnerScreenState extends ConsumerState<LabRunnerScreen> {
  InAppWebViewController? _webView;
  bool _ready = false;
  bool _fullscreen = false;
  double _progress = 0;
  int _tested = 0;
  int _total = 0;
  String? _loadError; // non-null when the R3F bundle failed to load

  @override
  void initState() {
    super.initState();
    SystemChrome.setPreferredOrientations(const [
      DeviceOrientation.portraitUp,
    ]);
    // Warm up the TTS engine so the first `narrate` from the web app
    // doesn't have a 1-2 second latency (Android needs to load voices).
    SparkTts.instance.init();
  }

  @override
  void dispose() {
    SparkTts.instance.stop();
    SystemChrome.setPreferredOrientations(DeviceOrientation.values);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final url = labUrl(widget.lab.id);
    final topPadding = MediaQuery.of(context).padding.top;

    // Intercept the Android system back gesture: if we're in fullscreen
    // mode, exit fullscreen first (bringing the header back) instead of
    // popping the entire lab route. Prevents students from getting
    // trapped when they miss the small floating exit chip.
    return PopScope(
      canPop: !_fullscreen,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop && _fullscreen) {
          HapticFeedback.selectionClick();
          setState(() => _fullscreen = false);
        }
      },
      child: Scaffold(
      backgroundColor: LabSparkTokens.slate950,
      // Full-bleed body — safe-area handled inside so the WebView can be edge-to-edge.
      body: Stack(
        children: [
          // ── WebView (full viewport) ────────────────────────────────
          Positioned.fill(
            top: _fullscreen ? 0 : topPadding + 48,
            child: !labHostConfigured
                ? const _HostNotConfigured()
                : InAppWebView(
                    initialUrlRequest: URLRequest(url: WebUri(url)),
                    initialSettings: InAppWebViewSettings(
                      javaScriptEnabled: true,
                      mediaPlaybackRequiresUserGesture: false,
                      allowsInlineMediaPlayback: true,
                      transparentBackground: true,
                      useHybridComposition: true,
                      hardwareAcceleration: true,
                      supportZoom: false,
                      builtInZoomControls: false,
                    ),
                    onWebViewCreated: (ctl) async {
                      _webView = ctl;
                      ctl.addJavaScriptHandler(
                        handlerName: 'lab',
                        callback: _onBridgeMessage,
                      );
                      // Bust any cached copy of the old web bundle so the
                      // freshly deployed embed CSS/JS actually loads.
                      try {
                        await InAppWebViewController.clearAllCache();
                      } catch (_) {}
                    },
                    onLoadStart: (_, __) => setState(() {
                      _progress = 0.05;
                      _loadError = null;
                    }),
                    onProgressChanged: (_, p) =>
                        setState(() => _progress = p / 100),
                    onLoadStop: (_, __) async {
                      setState(() => _progress = 1);
                      await _injectBridge();
                      await _sendInit();
                    },
                    onReceivedError: (_, __, err) {
                      setState(() {
                        _loadError = err.description.isNotEmpty
                            ? err.description
                            : 'Couldn\'t load the lab. Check your internet connection.';
                      });
                    },
                    onReceivedHttpError: (_, __, err) {
                      setState(() {
                        _loadError =
                            'Server returned ${err.statusCode}. Try again.';
                      });
                    },
                    onConsoleMessage: (_, msg) {
                      if (msg.messageLevel == ConsoleMessageLevel.ERROR) {
                        debugPrint('WebView console: ${msg.message}');
                      }
                    },
                  ),
          ),

          // ── Load-error overlay with retry ───────────────────────────
          if (_loadError != null && labHostConfigured)
            Positioned.fill(
              child: _LabLoadErrorOverlay(
                message: _loadError!,
                onRetry: () {
                  setState(() {
                    _loadError = null;
                    _ready = false;
                    _progress = 0;
                  });
                  _webView?.reload();
                },
              ),
            )
          else if (!_ready && labHostConfigured)
            Positioned.fill(
              child: IgnorePointer(
                ignoring: _ready,
                child: AnimatedOpacity(
                  opacity: _ready ? 0 : 1,
                  duration: const Duration(milliseconds: 220),
                  child: const _LabLoadingOverlay(),
                ),
              ),
            ),

          // ── Compact header (hides in fullscreen) ────────────────────
          AnimatedPositioned(
            duration: const Duration(milliseconds: 220),
            curve: Curves.easeOutCubic,
            top: _fullscreen ? -(topPadding + 60) : 0,
            left: 0, right: 0,
            child: _CompactHeader(
              lab: widget.lab,
              tested: _tested,
              total: _total,
              progress: _progress,
              topPadding: topPadding,
              onExit: _confirmExit,
              onFullscreen: () {
                HapticFeedback.selectionClick();
                setState(() => _fullscreen = true);
              },
            ),
          ),

          // ── Fullscreen-exit chip (shown only in fullscreen) ─────────
          Positioned(
            top: topPadding + 10,
            right: 12,
            child: AnimatedSlide(
              duration: const Duration(milliseconds: 220),
              offset: _fullscreen ? Offset.zero : const Offset(0, -1.5),
              child: AnimatedOpacity(
                duration: const Duration(milliseconds: 180),
                opacity: _fullscreen ? 1 : 0,
                child: _FloatingChip(
                  icon: Icons.fullscreen_exit_rounded,
                  tooltip: 'Exit fullscreen',
                  onTap: () {
                    HapticFeedback.selectionClick();
                    setState(() => _fullscreen = false);
                  },
                ),
              ),
            ),
          ),

          // ── Ask Spark FAB — small Gemini-style pill, bottom-right ──
          Positioned(
            right: 12,
            bottom: MediaQuery.of(context).padding.bottom + 16,
            child: _SparkFab(onTap: _openSparkSheet),
          ),
        ],
      ),
      ),
    );
  }

  Future<void> _injectBridge() async {
    await _webView?.evaluateJavascript(source: r'''
      window.LabSparkBridge = {
        emit(payload) {
          try {
            window.flutter_inappwebview.callHandler('lab', payload);
          } catch (e) { console.warn('LabSparkBridge.emit failed', e); }
        }
      };
      window.postToFlutter = (m) => window.LabSparkBridge.emit(m);
    ''');
  }

  Future<void> _sendInit() async {
    final user = FirebaseAuth.instance.currentUser;
    final payload = {
      'type': 'init',
      'labId': widget.lab.id,
      'labTitle': widget.lab.title,
      'labGrade': widget.lab.grade,
      'student': {
        'uid': user?.uid,
        'displayName': user?.displayName,
        'email': user?.email,
      },
    };
    await _webView?.evaluateJavascript(
      source: 'window.dispatchEvent(new CustomEvent("labspark:init", '
          '{detail: ${jsonEncode(payload)}}));',
    );
  }

  Future<dynamic> _onBridgeMessage(List<dynamic> args) async {
    if (args.isEmpty) return null;
    final raw = args.first;
    final Map<String, dynamic> payload = raw is String
        ? jsonDecode(raw) as Map<String, dynamic>
        : Map<String, dynamic>.from(raw as Map);
    final type = payload['type'] as String? ?? '';

    switch (type) {
      case 'ready':
        setState(() => _ready = true);
        return {'ok': true};

      case 'progress':
        setState(() {
          _tested = (payload['tested'] as num?)?.toInt() ?? _tested;
          _total = (payload['total'] as num?)?.toInt() ?? _total;
        });
        return {'ok': true};

      case 'askSpark':
        final q = (payload['question'] as String?) ?? '';
        final answer = await ref.read(sparkRepositoryProvider).ask(
              question: q,
              experiment: widget.lab.title,
            );
        return {'answer': answer};

      case 'narrate':
        // Real-time teacher voice-over — the web scene has just done or
        // observed something. Speak it aloud via native TTS AND capture
        // it in the persistent Spark conversation so students can scroll
        // back through everything Spark said.
        final text = (payload['text'] as String?) ?? '';
        if (text.trim().isNotEmpty) {
          ref.read(sparkConversationProvider(widget.lab.id).notifier).append(
                SparkMessage(
                  text: text,
                  fromSpark: true,
                  timestamp: DateTime.now(),
                  spoken: true,
                ),
              );
          // Fire and forget — don't block the bridge callback on TTS.
          unawaited(SparkTts.instance.speak(text));
        }
        return {'ok': true};

      case 'complete':
        HapticFeedback.mediumImpact();
        await _saveCompletion(payload);
        if (!mounted) return {'ok': true};
        // Extract score / feedback from the web app's result payload so the
        // celebration screen can show real values.
        final resultsRaw = payload['results'];
        final results = resultsRaw is Map ? resultsRaw : payload;
        final score = (results['score'] as num?)?.toInt() ??
            (results['correct'] as num?)?.toInt() ??
            0;
        final total = (results['total'] as num?)?.toInt() ??
            (results['count'] as num?)?.toInt() ??
            0;
        final feedback = (results['feedback'] as String?) ??
            (results['message'] as String?) ??
            'Great work finishing this lab! You classified $score out of $total correctly.';
        final badge = results['badge'] as String?;
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(
            builder: (_) => LabCompleteScreen(
              lab: widget.lab,
              score: score,
              total: total,
              feedback: feedback,
              badge: badge,
            ),
          ),
        );
        return {'ok': true};

      case 'exit':
        if (mounted) Navigator.of(context).pop();
        return {'ok': true};

      default:
        return {'ok': false};
    }
  }

  Future<void> _saveCompletion(Map<String, dynamic> payload) async {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) return;

    // The `payload` from the web app looks like:
    //   { type: 'complete', score, total, feedback, badge, results: {…}, verdicts: {…} }
    // Capture as much as we can (Firestore array elements have a 1MB doc
    // budget shared across everything, so keep observations small).
    final resultsRaw = payload['results'];
    final observationsRaw = payload['observations'] ?? payload['verdicts'];

    Map<String, dynamic> asMap(dynamic v) =>
        v is Map ? Map<String, dynamic>.from(v) : <String, dynamic>{};

    final entry = <String, dynamic>{
      'id': widget.lab.id,
      'title': widget.lab.title,
      'grade': widget.lab.grade,
      'subject': widget.lab.subject.label,
      'chapter': widget.lab.chapter,
      'score': (payload['score'] as num?)?.toInt() ??
          (resultsRaw is Map ? (resultsRaw['score'] as num?)?.toInt() : null) ??
          0,
      'total': (payload['total'] as num?)?.toInt() ??
          (resultsRaw is Map ? (resultsRaw['total'] as num?)?.toInt() : null) ??
          0,
      'feedback': (payload['feedback'] as String?) ??
          (resultsRaw is Map ? resultsRaw['feedback'] as String? : null) ??
          '',
      'badge': (payload['badge'] as String?) ??
          (resultsRaw is Map ? resultsRaw['badge'] as String? : null),
      'observations': asMap(observationsRaw),
      'results': asMap(resultsRaw),
      'completedAt': Timestamp.now(),
    };

    try {
      await FirebaseFirestore.instance
          .collection('users')
          .doc(user.uid)
          .set({
        'completions': FieldValue.arrayUnion([entry]),
        'xp': FieldValue.increment(30),
        'updatedAt': FieldValue.serverTimestamp(),
      }, SetOptions(merge: true));
    } catch (e) {
      debugPrint('Failed to save completion: $e');
    }
  }

  void _openSparkSheet() {
    HapticFeedback.selectionClick();
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => SparkLabSheet(lab: widget.lab),
    );
  }

  Future<void> _confirmExit() async {
    HapticFeedback.selectionClick();
    final leave = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Leave experiment?'),
        content: const Text('Your progress in this session won\'t be saved.'),
        actions: [
          TextButton(
              onPressed: () => Navigator.of(ctx).pop(false),
              child: const Text('Stay')),
          FilledButton(
              onPressed: () => Navigator.of(ctx).pop(true),
              child: const Text('Leave')),
        ],
      ),
    );
    if ((leave ?? false) && mounted) Navigator.of(context).pop();
  }
}

/// Very compact header: exit · title (one line) · Live pill.
/// Uses translucent dark surface so the lab shows through faintly.
class _CompactHeader extends StatelessWidget {
  const _CompactHeader({
    required this.lab,
    required this.tested,
    required this.total,
    required this.progress,
    required this.topPadding,
    required this.onExit,
    required this.onFullscreen,
  });
  final Lab lab;
  final int tested;
  final int total;
  final double progress;
  final double topPadding;
  final VoidCallback onExit;
  final VoidCallback onFullscreen;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.only(top: topPadding),
      decoration: BoxDecoration(
        color: LabSparkTokens.slate950.withValues(alpha: 0.86),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.3),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          SizedBox(
            height: 48,
            child: Row(
              children: [
                // Exit
                _HeaderIconButton(
                  icon: Icons.close_rounded,
                  onTap: onExit,
                  tooltip: 'Exit lab',
                ),
                // Title (single line — everything on the same row)
                Expanded(
                  child: Row(
                    children: [
                      Flexible(
                        child: Text(
                          lab.title,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.w800,
                            fontSize: 15,
                          ),
                        ),
                      ),
                      const SizedBox(width: 6),
                      _TinyDot(),
                      const SizedBox(width: 6),
                      Text(
                        'Cl ${lab.grade}',
                        style: TextStyle(
                          color: Colors.white.withValues(alpha: 0.72),
                          fontWeight: FontWeight.w700,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ),
                // Live badge / progress
                _LivePill(tested: tested, total: total),
                _HeaderIconButton(
                  icon: Icons.fullscreen_rounded,
                  onTap: onFullscreen,
                  tooltip: 'Fullscreen',
                ),
              ],
            ),
          ),
          // Progress line (only while <100% loading)
          if (progress > 0 && progress < 1)
            LinearProgressIndicator(
              value: progress,
              minHeight: 2,
              backgroundColor: Colors.transparent,
              valueColor:
                  const AlwaysStoppedAnimation<Color>(LabSparkTokens.teal500),
            ),
        ],
      ),
    );
  }
}

class _HeaderIconButton extends StatelessWidget {
  const _HeaderIconButton({
    required this.icon,
    required this.onTap,
    required this.tooltip,
  });
  final IconData icon;
  final VoidCallback onTap;
  final String tooltip;
  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 48,       // 48dp = Material minimum touch target
      height: 48,
      child: IconButton(
        splashRadius: 22,
        padding: EdgeInsets.zero,
        onPressed: onTap,
        tooltip: tooltip,
        icon: Icon(icon, color: Colors.white, size: 22),
      ),
    );
  }
}

class _TinyDot extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      width: 3,
      height: 3,
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.55),
        shape: BoxShape.circle,
      ),
    );
  }
}

class _LivePill extends StatelessWidget {
  const _LivePill({required this.tested, required this.total});
  final int tested;
  final int total;
  @override
  Widget build(BuildContext context) {
    final showProgress = total > 0;
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 4),
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: LabSparkTokens.teal500.withValues(alpha: 0.18),
        borderRadius: BorderRadius.circular(100),
        border: Border.all(
          color: LabSparkTokens.teal500.withValues(alpha: 0.45),
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 7, height: 7,
            decoration: const BoxDecoration(
              color: LabSparkTokens.teal500,
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 6),
          Text(
            showProgress ? '$tested / $total' : 'Live',
            style: const TextStyle(
              color: Colors.white,
              fontWeight: FontWeight.w800,
              fontSize: 10.5,
              letterSpacing: 0.8,
            ),
          ),
        ],
      ),
    );
  }
}

class _FloatingChip extends StatelessWidget {
  const _FloatingChip({
    required this.icon,
    required this.onTap,
    required this.tooltip,
  });
  final IconData icon;
  final VoidCallback onTap;
  final String tooltip;
  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message: tooltip,
      child: Material(
        color: Colors.black.withValues(alpha: 0.55),
        shape: const CircleBorder(),
        child: InkWell(
          onTap: onTap,
          customBorder: const CircleBorder(),
          child: SizedBox(
            width: 48, height: 48, // Material minimum touch target
            child: Icon(icon, color: Colors.white, size: 22),
          ),
        ),
      ),
    );
  }
}

/// Prominent Spark FAB — 64dp gradient orb with a slow-breath pulse so
/// students always know Spark is here to help. Voice input + spoken replies
/// happen inside the bottom sheet that opens on tap.
class _SparkFab extends StatefulWidget {
  const _SparkFab({required this.onTap});
  final VoidCallback onTap;
  @override
  State<_SparkFab> createState() => _SparkFabState();
}

class _SparkFabState extends State<_SparkFab>
    with SingleTickerProviderStateMixin {
  late final AnimationController _ctl = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1800),
  )..repeat(reverse: true);

  @override
  void dispose() {
    _ctl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: 'Ask Spark for help with this experiment',
      child: AnimatedBuilder(
      animation: _ctl,
      builder: (_, __) {
        final scale = 0.97 + (_ctl.value * 0.05);
        return Transform.scale(
          scale: scale,
          child: Material(
            elevation: 8,
            shape: const CircleBorder(),
            color: Colors.transparent,
            child: InkWell(
              onTap: widget.onTap,
              customBorder: const CircleBorder(),
              child: Container(
                width: 64, height: 64,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: const LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [LabSparkTokens.teal500, LabSparkTokens.teal600],
                  ),
                  border: Border.all(
                    color: Colors.white.withValues(alpha: 0.35),
                    width: 1.5,
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: LabSparkTokens.teal500
                          .withValues(alpha: 0.5 + _ctl.value * 0.2),
                      blurRadius: 18 + _ctl.value * 8,
                      spreadRadius: 2,
                    ),
                  ],
                ),
                child: const Icon(
                  Icons.auto_awesome_rounded,
                  color: Colors.white,
                  size: 28,
                ),
              ),
            ),
          ),
        );
      },
      ),
    );
  }
}

class _LabLoadingOverlay extends StatelessWidget {
  const _LabLoadingOverlay();
  @override
  Widget build(BuildContext context) {
    return Container(
      color: LabSparkTokens.slate950,
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const LabSparkLogoTile(size: 76),
            const SizedBox(height: 24),
            const SizedBox(
              width: 32,
              height: 32,
              child: CircularProgressIndicator(
                strokeWidth: 3,
                valueColor: AlwaysStoppedAnimation<Color>(
                  LabSparkTokens.teal500,
                ),
              ),
            ),
            const SizedBox(height: 16),
            Text(
              'Preparing your workbench…',
              style: TextStyle(
                color: Colors.white.withValues(alpha: 0.75),
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Shown when the WebView returns a network / HTTP error while loading
/// the R3F 3D lab bundle. Offers a retry so students on flaky cellular
/// aren't stuck staring at a blank white surface.
class _LabLoadErrorOverlay extends StatelessWidget {
  const _LabLoadErrorOverlay({required this.message, required this.onRetry});
  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Container(
      color: LabSparkTokens.slate950,
      padding: const EdgeInsets.symmetric(horizontal: 32),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 72, height: 72,
            decoration: BoxDecoration(
              color: LabSparkTokens.rose600.withValues(alpha: 0.18),
              borderRadius: BorderRadius.circular(20),
            ),
            child: const Icon(
              Icons.wifi_off_rounded,
              color: LabSparkTokens.rose600,
              size: 36,
            ),
          ),
          const SizedBox(height: 20),
          const Text(
            'Couldn\'t load the lab',
            style: TextStyle(
              color: Colors.white,
              fontSize: 18,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            message,
            textAlign: TextAlign.center,
            style: TextStyle(
              color: Colors.white.withValues(alpha: 0.7),
              fontSize: 13,
              height: 1.5,
            ),
          ),
          const SizedBox(height: 24),
          FilledButton.icon(
            onPressed: onRetry,
            icon: const Icon(Icons.refresh_rounded),
            label: const Text('Try again'),
            style: FilledButton.styleFrom(
              backgroundColor: LabSparkTokens.teal600,
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
            ),
          ),
        ],
      ),
    );
  }
}

class _HostNotConfigured extends StatelessWidget {
  const _HostNotConfigured();
  @override
  Widget build(BuildContext context) {
    return Container(
      color: LabSparkTokens.slate950,
      padding: const EdgeInsets.symmetric(horizontal: 32),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 72, height: 72,
            decoration: BoxDecoration(
              color: LabSparkTokens.amber500.withValues(alpha: 0.14),
              borderRadius: BorderRadius.circular(20),
            ),
            child: const Icon(Icons.construction_rounded,
                color: LabSparkTokens.amber500, size: 36),
          ),
          const SizedBox(height: 20),
          const Text('3D lab host not configured',
              style: TextStyle(
                color: Colors.white,
                fontSize: 18,
                fontWeight: FontWeight.w800,
              )),
          const SizedBox(height: 8),
          Text(
            'Deploy the web app to Firebase Hosting, then run with\n'
            '--dart-define=LABSPARK_LAB_HOST=https://your-app.web.app',
            textAlign: TextAlign.center,
            style: TextStyle(
              color: Colors.white.withValues(alpha: 0.6),
              fontSize: 12.5, height: 1.5,
            ),
          ),
        ],
      ),
    );
  }
}
